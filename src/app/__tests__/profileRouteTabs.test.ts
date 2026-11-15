import { describe, it, expect } from "vitest";
import { router } from "@/app/router";
import { PROFILE_TAB_KEYS } from "@/routes/Profile";

// The /profile route drops any ?tab= it does not recognise, and the page then shows the Profile tab.
// A tab missing from that check (like "phones" was) sends the user straight back to Profile.
const validateProfileSearch = (search: Record<string, unknown>) => {
  const route = (router.routesByPath as Record<string, any>)["/profile"];
  return route.options.validateSearch(search) as { tab?: string };
};

describe("/profile tab search param", () => {
  it.each(PROFILE_TAB_KEYS)("keeps ?tab=%s", (tab) => {
    expect(validateProfileSearch({ tab }).tab).toBe(tab);
  });

  it("keeps the Connected phones tab", () => {
    expect(validateProfileSearch({ tab: "phones" }).tab).toBe("phones");
  });

  it("drops an unknown tab", () => {
    expect(validateProfileSearch({ tab: "nonsense" }).tab).toBeUndefined();
  });
});
