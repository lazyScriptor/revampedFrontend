import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProfileRoute from "../Profile";

// The profile query is swapped between renders to reproduce loading -> loaded.
let profileState: { isLoading: boolean; isError: boolean; data: unknown; error: unknown } = {
  isLoading: true,
  isError: false,
  data: undefined,
  error: null,
};

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useSearch: () => ({ tab: "profile" }),
}));

vi.mock("@/features/profile/hooks/useMe", () => ({
  useMyProfile: () => profileState,
}));

// Like the real one, the mock calls a React hook, so calling it after an early return changes the hook count.
vi.mock("@/features/plan/usePlan", async () => {
  const React = await import("react");
  return {
    usePlanChecker: () => {
      React.useRef(null);
      return () => true;
    },
  };
});

vi.mock("@/features/profile/components/AvatarBlock", () => ({ AvatarBlock: () => null }));
vi.mock("@/features/profile/components/ProfileForm", () => ({
  ProfileForm: () => <div data-testid="profile-form" />,
}));

describe("Profile route", () => {
  it("keeps the same hooks when the profile finishes loading", () => {
    const { rerender } = render(<ProfileRoute />);

    profileState = {
      isLoading: false,
      isError: false,
      data: { user_id: 1, Roles: [{ hierarchy_level: 100 }] },
      error: null,
    };
    // React throws error #310 here if a hook only runs after the loading return.
    rerender(<ProfileRoute />);

    expect(screen.getByTestId("profile-form")).toBeInTheDocument();
  });
});
