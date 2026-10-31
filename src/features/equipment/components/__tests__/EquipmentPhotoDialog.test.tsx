import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";
import { useAuthStore } from "@/stores/useAuthStore";

const api = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn(), delete: vi.fn() }));
vi.mock("@/lib/api", () => ({ api }));
vi.mock("@/lib/socket", () => ({ connectSocket: vi.fn(), getSocket: () => ({ on: vi.fn(), off: vi.fn() }) }));
const devices = vi.hoisted(() => ({ list: [{ device_id: "gg-1" }] as any[] }));
vi.mock("@/features/signatures/hooks/useSignatures", () => ({
  useMyDevices: () => ({ isLoading: false, data: { devices: devices.list } }),
}));
vi.mock("../../lib/compressImage", async (orig) => {
  const real: any = await orig();
  return {
    ...real,
    compressImage: vi.fn(async (file: File) => {
      if (file.name.endsWith(".heic")) throw new real.CompressError("heic");
      return { blob: new Blob(["x"], { type: "image/webp" }), type: "image/webp", width: 1600, height: 1200, originalBytes: 3_500_000 };
    }),
  };
});

import { EquipmentPhotoDialog } from "../EquipmentPhotoDialog";

const equipment = { equipment_id: 5, equipment_name: "Concrete Mixer", serial_number: "CM-03", image_url: null };

const renderDialog = () => {
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <EquipmentPhotoDialog open equipment={equipment} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { onClose };
};

const pickFile = (name = "mixer.jpg", type = "image/jpeg") =>
  fireEvent.change(screen.getByTestId("photo-file-input"), { target: { files: [new File(["data"], name, { type })] } });

beforeEach(() => {
  vi.clearAllMocks();
  devices.list = [{ device_id: "gg-1" }];
  globalThis.URL.createObjectURL = vi.fn(() => "blob:preview");
  globalThis.URL.revokeObjectURL = vi.fn();
  useAuthStore.setState({ user: { permissions: ["equipment:edit"] } as any, token: "t" } as any);
  useAuthStore.setState({ hasPermission: (c: string) => c === "equipment:edit" } as any);
});

describe("EquipmentPhotoDialog — upload from this computer", () => {
  it("shrinks the photo, shows the size saving, uploads and confirms", async () => {
    api.post.mockResolvedValue({ data: { equipment_id: 5, image_url: "/uploads/equipment/t/5-1.webp" } });
    renderDialog();
    pickFile();
    expect(await screen.findByText(/3.3 MB → 1 KB · 1600 × 1200/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save photo" }));
    expect(await screen.findByText("Photo updated")).toBeTruthy();
    const [url, form] = api.post.mock.calls[0];
    expect(url).toBe("/equipment/5/image");
    expect((form as FormData).get("image")).toBeInstanceOf(Blob);
  });

  it("keeps the photo after a failed upload so Try again works without picking it again", async () => {
    api.post.mockRejectedValueOnce(Object.assign(new Error("The photo is too large (max 4 MB)."), { status: 413 }));
    api.post.mockResolvedValueOnce({ data: { equipment_id: 5, image_url: "/uploads/x.webp" } });
    renderDialog();
    pickFile();
    fireEvent.click(await screen.findByRole("button", { name: "Save photo" }));
    expect(await screen.findByText(/too large/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Photo updated")).toBeTruthy();
    expect(api.post).toHaveBeenCalledTimes(2);
  });

  it("explains files it can't use, before uploading anything", async () => {
    renderDialog();
    pickFile("notes.pdf", "application/pdf");
    expect(await screen.findByText(/isn't a photo/)).toBeTruthy();
    pickFile("IMG_0001.heic", "image/heic");
    expect(await screen.findByText(/HEIC/)).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe("EquipmentPhotoDialog — paired phone", () => {
  it("asks the phone, waits, and shows the photo when it arrives", async () => {
    api.post.mockResolvedValue({ data: { token: "tok", status: "PENDING", equipment_id: 5, expires_at: new Date(Date.now() + 300_000).toISOString() } });
    api.get.mockResolvedValueOnce({ data: { token: "tok", status: "PENDING", equipment_id: 5 } });
    api.get.mockResolvedValue({ data: { token: "tok", status: "COMPLETED", equipment_id: 5, image_url: "/uploads/equipment/t/5.webp" } });
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Take with phone" }));
    expect(await screen.findByText("Camera opening on your phone")).toBeTruthy();
    expect(api.post).toHaveBeenCalledWith("/equipment/5/photo-requests");
    await waitFor(() => expect(screen.getByText("Photo updated")).toBeTruthy(), { timeout: 6000 });
  }, 10_000);

  it("cancelling tells the server", async () => {
    api.post.mockResolvedValue({ data: { token: "tok", status: "PENDING", equipment_id: 5, expires_at: new Date(Date.now() + 300_000).toISOString() } });
    api.get.mockResolvedValue({ data: { token: "tok", status: "PENDING", equipment_id: 5 } });
    api.delete.mockResolvedValue({});
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Take with phone" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel phone request" }));
    await act(async () => {});
    expect(api.delete).toHaveBeenCalledWith("/equipment/photo-requests/tok");
    expect(screen.getByRole("button", { name: "Take with phone" })).toBeTruthy();
  });

  it("without a paired phone, says how to pair one", () => {
    devices.list = [];
    renderDialog();
    expect((screen.getByRole("button", { name: "Take with phone" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Pair one in Profile/)).toBeTruthy();
  });
});

it("people without edit permission only see the photo", () => {
  useAuthStore.setState({ hasPermission: () => false } as any);
  renderDialog();
  expect(screen.getByText(/needs equipment edit permission/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Upload from this computer" })).toBeNull();
});

it("computer upload asks for a multipart request so the file is not turned into JSON", async () => {
  api.post.mockResolvedValue({ data: { equipment_id: 5, image_url: "/uploads/x.webp" } });
  renderDialog();
  pickFile();
  fireEvent.click(await screen.findByRole("button", { name: "Save photo" }));
  await screen.findByText("Photo updated");
  expect(api.post.mock.calls[0][2].headers).toEqual({ "Content-Type": "multipart/form-data" });
});
