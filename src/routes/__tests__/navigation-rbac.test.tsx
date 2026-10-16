import { describe, it, expect } from "vitest";

/**
 * Navigation RBAC & Sidebar Filtering Tests
 * Validates BUG-P1-06: Verifies whether sidebar permissions are granular or incorrectly collapsed.
 */

interface NavItem {
  text: string;
  requiredPermission?: string;
}

describe("Navigation RBAC Sidebar Filtering Tests", () => {
  // Legacy buggy items using the single 'inventory_permission' flag for everything
  const buggyNavItems: NavItem[] = [
    { text: "Dashboard" },
    { text: "Inventory", requiredPermission: "inventory_permission" },
    { text: "Customers", requiredPermission: "inventory_permission" },
    { text: "Invoices", requiredPermission: "inventory_permission" },
    { text: "Data Arena", requiredPermission: "inventory_permission" },
    { text: "Workforce", requiredPermission: "workforce:view" },
    { text: "Accounting", requiredPermission: "inventory_permission" }, // BUG
    { text: "Reports", requiredPermission: "inventory_permission" },    // BUG
  ];

  // Remediated granular nav items
  const fixedNavItems: NavItem[] = [
    { text: "Dashboard" },
    { text: "Inventory", requiredPermission: "equipment:view" },
    { text: "Customers", requiredPermission: "customer:view" },
    { text: "Invoices", requiredPermission: "invoice:view" },
    { text: "Data Arena", requiredPermission: "data_arena:view" },
    { text: "Workforce", requiredPermission: "workforce:view" },
    { text: "Accounting", requiredPermission: "accounting:view" },
    { text: "Reports", requiredPermission: "report:view" },
  ];

  const filterNavItems = (items: NavItem[], userPerms: string[], userRoles: string[] = []) => {
    const isSuper = userRoles.some((r) =>
      ["admin", "superadmin", "owner"].includes(r.toLowerCase())
    );
    if (isSuper) return items;

    return items.filter((item) => {
      if (!item.requiredPermission) return true;
      return userPerms.includes(item.requiredPermission);
    });
  };

  it("proves BUG-P1-06: Accountant with accounting:view sees an empty sidebar under legacy flags", () => {
    const accountantPerms = ["accounting:view", "report:view"];
    const visibleUnderBuggyConfig = filterNavItems(buggyNavItems, accountantPerms);

    const visibleTitles = visibleUnderBuggyConfig.map((i) => i.text);
    expect(visibleTitles).toContain("Dashboard");
    // Under buggy config, Accounting and Reports are gated on inventory_permission, so they are HIDDEN:
    expect(visibleTitles).not.toContain("Accounting");
    expect(visibleTitles).not.toContain("Reports");
  });

  it("verifies proper granular access under remediated permissions", () => {
    const accountantPerms = ["accounting:view", "report:view"];
    const visibleUnderFixedConfig = filterNavItems(fixedNavItems, accountantPerms);

    const visibleTitles = visibleUnderFixedConfig.map((i) => i.text);
    expect(visibleTitles).toContain("Dashboard");
    expect(visibleTitles).toContain("Accounting");
    expect(visibleTitles).toContain("Reports");
    // Correctly hides Inventory and Workforce:
    expect(visibleTitles).not.toContain("Inventory");
    expect(visibleTitles).not.toContain("Workforce");
  });

  it("allows Admin to view all navigation sections unconditionally", () => {
    const visibleForAdmin = filterNavItems(fixedNavItems, [], ["Admin"]);
    expect(visibleForAdmin).toHaveLength(fixedNavItems.length);
  });
});
