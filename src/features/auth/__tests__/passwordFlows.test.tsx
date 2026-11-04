import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({ request: vi.fn(), reset: vi.fn(), change: vi.fn() }));
vi.mock("../api/auth.api", () => ({ requestPasswordCode: api.request, resetPasswordWithCode: api.reset }));
vi.mock("@/features/profile/api/me.api", () => ({ changeMyPassword: api.change }));

import { useAuthStore } from "@/stores/useAuthStore";
import { loginSchema } from "../schemas/auth.schema";
import { ForgotPasswordDialog } from "../ForgotPasswordDialog";
import { ForcePasswordChange } from "../ForcePasswordChange";
import { ResetCodeDialog } from "@/features/admin/components/ResetCodeDialog";

const type = (name: RegExp, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } });

beforeEach(() => {
  Object.values(api).forEach((f) => { f.mockReset(); f.mockResolvedValue(undefined); });
  useAuthStore.setState({ user: null } as any);
});

describe("login field", () => {
  it("takes an email or a username", () => {
    expect(loginSchema.safeParse({ email: "kasun", password: "secret12" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@b.lk", password: "secret12" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "  ", password: "secret12" }).success).toBe(false);
  });
});

describe("forgot password", () => {
  const open = () => render(<ForgotPasswordDialog open onClose={vi.fn()} />);
  const toCodeStep = async () => {
    open();
    type(/Email or username/, " kasun ");
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    await screen.findByLabelText(/6-digit code/);
  };
  it("asks for a code using what was typed", async () => {
    await toCodeStep();
    expect(api.request).toHaveBeenCalledWith("kasun");
  });
  it("only allows a full code and matching passwords of 8 or more", async () => {
    await toCodeStep();
    const set = screen.getByRole("button", { name: "Set password" }) as HTMLButtonElement;
    type(/6-digit code/, "12a34");
    expect((screen.getByLabelText(/6-digit code/) as HTMLInputElement).value).toBe("1234");
    type(/^New password/, "longenough");
    type(/Confirm new password/, "different1");
    expect(screen.getByText("These don't match.")).toBeTruthy();
    expect(set.disabled).toBe(true);
    type(/6-digit code/, "123456");
    type(/Confirm new password/, "longenough");
    expect(set.disabled).toBe(false);
  });
  it("sets the password and says so", async () => {
    await toCodeStep();
    type(/6-digit code/, "123456");
    type(/^New password/, "longenough");
    type(/Confirm new password/, "longenough");
    fireEvent.click(screen.getByRole("button", { name: "Set password" }));
    await screen.findByText(/has been changed/);
    expect(api.reset).toHaveBeenCalledWith({ identifier: "kasun", code: "123456", new_password: "longenough" });
  });
  it("shows the server's message and stays on the step", async () => {
    api.reset.mockRejectedValue(new Error("That code is wrong or has expired."));
    await toCodeStep();
    type(/6-digit code/, "123456");
    type(/^New password/, "longenough");
    type(/Confirm new password/, "longenough");
    fireEvent.click(screen.getByRole("button", { name: "Set password" }));
    await screen.findByText(/wrong or has expired/);
    expect(screen.getByLabelText(/6-digit code/)).toBeTruthy();
  });
});

describe("forced password change", () => {
  it("doesn't appear for normal users", () => {
    useAuthStore.setState({ user: { must_change_password: false } } as any);
    render(<ForcePasswordChange />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("can't be closed until the password is changed, then goes away", async () => {
    useAuthStore.setState({ user: { must_change_password: true } } as any);
    render(<ForcePasswordChange />);
    const set = screen.getByRole("button", { name: "Set password" }) as HTMLButtonElement;
    expect(set.disabled).toBe(true);
    type(/Current password/, "temporary1");
    type(/^New password/, "temporary1");
    type(/Confirm new password/, "temporary1");
    expect(set.disabled).toBe(true); // same as the temporary one
    type(/^New password/, "mine-now-1");
    type(/Confirm new password/, "mine-now-1");
    fireEvent.click(set);
    await waitFor(() => expect(useAuthStore.getState().user?.must_change_password).toBe(false));
    expect(api.change).toHaveBeenCalledWith({ currentPassword: "temporary1", newPassword: "mine-now-1" });
  });
});

describe("admin reset code", () => {
  const code = { code: "123456", minutes: 30, name: "Kasun", username: "kasun", whatsapp_digits: "94771234567" };
  it("makes no code until asked, then opens WhatsApp with the message", async () => {
    const createCode = vi.fn(async () => code);
    const open = vi.spyOn(window, "open").mockReturnValue({} as any);
    render(<ResetCodeDialog open onClose={vi.fn()} name="Kasun" createCode={createCode} />);
    expect(createCode).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Create code" }));
    await screen.findByText("123456");
    fireEvent.click(screen.getByRole("button", { name: "Send on WhatsApp" }));
    const url = open.mock.calls[0][0] as string;
    expect(url).toContain("wa.me/94771234567");
    expect(decodeURIComponent(url)).toContain("123456");
    open.mockRestore();
  });
  it("says so when there's no number", async () => {
    render(<ResetCodeDialog open onClose={vi.fn()} name="Kasun" createCode={async () => ({ ...code, whatsapp_digits: "" })} />);
    fireEvent.click(screen.getByRole("button", { name: "Create code" }));
    await screen.findByText(/No WhatsApp number/);
  });
  it("shows why it couldn't make a code", async () => {
    render(<ResetCodeDialog open onClose={vi.fn()} name="Owner" createCode={async () => { throw new Error("You can't reset the password of someone with a higher role."); }} />);
    fireEvent.click(screen.getByRole("button", { name: "Create code" }));
    await screen.findByText(/higher role/);
  });
});
