import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";
import { assertImageFile } from "../../lib/compressImage";
import { resolveAssetUrl } from "@/lib/assetUrl";

const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/api", () => ({ api }));
vi.mock("@/features/signatures/lib/deviceId", () => ({ getDeviceId: () => "gg-phone-1" }));

import { PhonePhotoPage } from "../PhonePhotoPage";

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <PhonePhotoPage token="tok" />
    </QueryClientProvider>,
  );

const pending = { token: "tok", status: "PENDING", equipment_id: 5, equipment: { equipment_id: 5, equipment_name: "Concrete Mixer", serial_number: "CM-03" } };

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
});

describe("PhonePhotoPage", () => {
  it("shows which machine to photograph", async () => {
    api.get.mockResolvedValue({ data: pending });
    renderPage();
    expect(await screen.findByText("CM-03 · Concrete Mixer")).toBeTruthy();
  });

  it("when the live camera can't start, offers the phone's own camera in one tap", async () => {
    api.get.mockResolvedValue({ data: pending });
    renderPage(); // jsdom has no getUserMedia
    expect(await screen.findByRole("button", { name: "Open camera" })).toBeTruthy();
    expect(screen.getByText(/live camera isn't available/)).toBeTruthy();
    const capture = document.querySelector('input[capture="environment"]') as HTMLInputElement;
    expect(capture?.accept).toBe("image/*");
  });

  it("if the counter cancels, says so and goes back to waiting", async () => {
    api.get.mockResolvedValue({ data: { ...pending, status: "CANCELLED" } });
    renderPage();
    expect(await screen.findByText("The counter cancelled this request.")).toBeTruthy();
  });
});

describe("photo helpers", () => {
  it("rejects non-images and huge files before decoding", () => {
    expect(() => assertImageFile(new File(["x"], "a.pdf", { type: "application/pdf" }))).toThrow("not-image");
    const big = new File(["x"], "a.jpg", { type: "image/jpeg" });
    Object.defineProperty(big, "size", { value: 31 * 1024 * 1024 });
    expect(() => assertImageFile(big)).toThrow("too-large");
    expect(() => assertImageFile(new File(["x"], "IMG.HEIC", { type: "" }))).not.toThrow();
  });

  it("points uploaded photos at the API host and leaves stock photos alone", () => {
    expect(resolveAssetUrl("https://app.geargrid.live/equipment/x.webp")).toBe("https://app.geargrid.live/equipment/x.webp");
    expect(resolveAssetUrl(null)).toBeNull();
    expect(resolveAssetUrl("/uploads/equipment/t/5.webp")).toMatch(/\/uploads\/equipment\/t\/5\.webp$/);
  });
});
