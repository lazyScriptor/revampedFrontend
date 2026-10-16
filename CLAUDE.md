# GearGrid Frontend

Vite + React 18 + TypeScript. Pairs with the `revampedBackend` repo.

## Design intelligence — UI/UX Pro Max skill

Installed at user level (`~/.claude/skills/`, not in this repo). The skill is invokable directly via the Skill tool — for any UI/UX-design task (new pages, restyling, picking colors/typography, layout reviews, accessibility checks) invoke it **before** sketching markup. The companion skills `design`, `design-system`, `ui-styling`, `brand`, `banner-design`, and `slides` are also available.

Raw CLI access if you need it:

```bash
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <style|color|ux|typography|chart|landing|product|google-fonts> -n 3
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<context>" --design-system -p "GearGrid"
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack react
```

Read `~/.claude/skills/ui-ux-pro-max/SKILL.md` for the full set of flags and the persistence pattern.

## Stack — what's actually here

- **Routing**: TanStack Router (file-based in `src/routes/`)
- **Data**: TanStack Query v5 (queryClient in `src/app/queryClient.ts`)
- **Forms**: react-hook-form + Zod (`@hookform/resolvers/zod`)
- **State**: Zustand (`src/stores/useAuthStore.ts`, `useUiStore.ts`, `useSuperAdminStore.ts`) — `useAuthStore` is **persisted** to localStorage under `geargrid-auth-storage` (includes `user` and `token`).
- **UI**: **MUI v9** + Emotion. Tailwind utility classes also appear (don't add more — prefer MUI `sx`)
- **HTTP**: axios via `src/lib/api.ts`.
  - Request interceptor attaches `Authorization: Bearer <token>` from Zustand store alongside `withCredentials: true` (Dual-Layer Auth).
  - Response interceptor returns `response.data` directly, so hooks receive the unwrapped body (e.g. `{ status, data }`), not the Axios wrapper.
  - On 401, attempts silent refresh (`/auth/refresh`), persists the new token, and replays pending requests. Dispatches `auth:unauthorized` only if refresh fails.

## Commands

| Task | Command |
|---|---|
| Dev server | `npm run dev` (port 5173) |
| Type check | `npx tsc --noEmit` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Backend API | set `VITE_API_URL=http://localhost:8086/api` in `.env` |
| Super-Admin | `https://app.geargrid.live/super-admin/login` (`admin7@myrental.com` / `Admin@123`) |
| Tenant Language | Set in Super Admin `/super-admin/tenants` or DB `system_config.default_language` ('en'/'si'/'ta') |

## Definition of done

1. **Type check passes** — `npx tsc --noEmit`. There are a few pre-existing errors in `_authenticated.tsx` and `RentalHistory.tsx` (MUI v9 `primaryTypographyProps` / polymorphic `component={Link}` patterns). **Don't fix them mid-feature**; only touch when explicitly cleaning up that file.
2. **Test the change in the browser**, not just the type checker. Vite HMR catches most things; full reload after auth-related changes.
3. **Dual-Layer Auth (No Login Bounces)**: Always pass `token` to `setAuth(user, token)` in login mutations. Do NOT strip `Authorization: Bearer` in `api.ts` — cross-port dev (`:5173` $\to$ `:8086`) and Safari omit/drop `SameSite=Lax` / `Secure` cookies, which causes instant 401 bounce-backs to `/login` when landing on `/dashboard`. Vite dev proxy in `vite.config.js` also forwards `/api` and `/uploads`.
4. **Vercel Deployment Verification**: Pushes to `main` auto-deploy to **Vercel** (`https://geargrid.live`, `https://app.geargrid.live`). Always check Vercel deployment dashboard if live production behavior lags behind local commits.

## Multi-tenant theming (important)

- After login, `useAuthStore.user.configData` holds the tenant's `TENANT_CONFIG` row: `primary_color`, `secondary_color`, `business_display_name`, `logo_url`.
- `src/app/DynamicThemeProvider.tsx` reads that and rebuilds the MUI theme via `createAppTheme(primary, secondary)` from `src/app/theme.ts`. The provider is mounted in `main.tsx` — **don't replace it with a static `<ThemeProvider>`**.
- **Don't set `palette.primary.light`/`.dark` manually** — MUI derives proper hover/active shades from `main` only. Overriding all three to the same hex kills interaction feedback.
- **`configData.logo_url` may be a relative path** like `/uploads/logos/foo.png`. Resolve against `import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")` before using as `<img src>`.

## Permissions

```ts
useAuthStore.getState().hasPermission("invoice:edit")
useAuthStore.getState().hasAnyPermission("view_x", "view_y")
useAuthStore.getState().hasRole("admin")
```

Permissions live in `user.permissions: string[]` (computed server-side from role permissions + per-user overrides). Sidebar items filter on `item.requiredPermission` — see `_authenticated.tsx`.

## File layout

```
src/
  app/             — providers (theme, query client, router), root config
  routes/          — TanStack Router file-based routes
    __root.tsx     — root route
    _authenticated.tsx — layout for protected routes
    <page>.tsx     — top-level pages
    admin/, dashboard/  — nested
  features/<area>/ — feature modules
    api/           — typed wrappers around api.ts
    hooks/         — TanStack Query hooks
    components/    — area-specific components
    schemas/       — Zod schemas
    types.ts
  stores/          — Zustand stores
  lib/             — shared utilities (api client, helpers)
  components/ui/   — design-system primitives (AppToast etc.)
```

## MUI v9 gotchas

- **`slotProps` replaces `*Props`** — use `slotProps={{ paper: {...}, input: {...}, select: { MenuProps: {...} } }}`, not `PaperProps` / `InputProps`. The old props still work in many places but new code should use `slotProps`.
- **`ListItemText` `primaryTypographyProps` is deprecated** → put styling in `slotProps={{ primary: { sx: ... } }}` or use a custom `<Typography>` as child.
- **`<Typography fontWeight="bold">` fails strict TS** — write `sx={{ fontWeight: 700 }}` instead.
- **`<ListItemButton component={Link}>`** (polymorphic + TanStack Router) flags TS2769 in this project — pre-existing, ignore unless cleaning up.
- **MUI inputs in dark containers (`#0f172a`)**: Global theme sets `MuiOutlinedInput` background to `#FFFFFF`. Setting `color: "white"` without overriding `bgcolor` causes invisible white-on-white text. Always specify `bgcolor: "#1e293b"` and `& .MuiInputBase-input: { color: "#f8fafc !important", WebkitTextFillColor: "#f8fafc !important" }`.
- **Flex child scrolling**: Any scrollable child (`overflowY: "auto"`) inside a flex column with `height: "100%"` must have `minHeight: 0` on both itself and all parent flex containers, otherwise children refuse to shrink and bottom content is clipped.

## API patterns

- **`api.ts` interceptor ALREADY unwraps `response.data` (CRITICAL TRAP)**:
  - `api.interceptors.response.use((response) => response.data)` returns the backend JSON envelope `{ status: 'success', data: ... }` directly.
  - **NEVER** write `res.data?.data` without checking `res.data` first! Doing `return res.data?.data || []` will evaluate to `undefined` and silently return an empty fallback `[]` even when the API returned `200 OK` with records.
  - Correct pattern:
    ```ts
    const res: any = await api.get('/invoices/print-logs', { params });
    return res?.data?.logs !== undefined ? res.data : res?.data?.data || res;
    ```
- File uploads: build a `FormData`, pass `headers: { 'Content-Type': 'multipart/form-data' }`. See `useUploadTenantLogo`.
- Tenant data JSON fields (`branding`, `feature_flags`, `cors_whitelist`) come back as real objects/arrays — backend normalizes. There's still a `parseJson()` guard in `TenantDetailPanel.tsx`; keep it as belt-and-braces.

## POS Thermal Printing & Print Audit Logs

- **Thermal Print Engine (`src/features/invoices/utils/thermalPrint.ts`)**:
  - Measures exact receipt DOM height (`heightMm`) and injects `@page { size: 80mm ${heightMm}mm; margin: 0 !important; }` with `page-break-inside: avoid` to prevent mid-bill splits and paper waste on continuous thermal rolls.
  - Supports direct silent printing via local `geargrid-print-agent` (`http://127.0.0.1:17420`) with automatic fallback to an isolated iframe browser print dialog.
  - **Log Before Print**: Always `await logPrintEventToServer(...)` **before** calling `iframe.contentWindow.print()` (which blocks the JS main thread) and immediately invalidate `["invoice-print-logs"]`, `["invoices"]`, and `["invoice", invoiceId]`.
- **Snapshot Receipt Normalization (`src/features/invoices/components/InvoiceReceipt.tsx`)**:
  - `buildSnapshotReceiptProps(log)` normalizes both full Sequelize snapshots (`{ Customer, InvoiceLines, Payments, sub_total, total_amount }`) and summary snapshots (`{ customer, items, fees }`) so historical point-in-time previews in `InvoicePrintLogsView.tsx` and `InvoicePrintHistoryDialog.tsx` always render complete customer, item, payment, and balance details.
- **Dedicated Print Audit Section in Reports (`/reports?category=audit`)**:
  - `InvoicePrintLogsView` is integrated into the Reports analytics suite with deep-linking (`/reports?category=audit`) and sidebar integration under `Reports → Print Audit`.
  - Guarded by granular permission `invoice:print_log:view` for RBAC compliance.
  - Features high-performance sticky headers (`stickyHeader`) and max-height internal table scroll.
- **Streamlined Manage Orders & Financial Panel Layout (`ManageInvoiceViews.tsx`)**:
  - **Reclaimed Vertical Real Estate**: The bulky bottom ID Vault box was eliminated. ID Vault operations are now exposed via a compact button in the terminal header (`Release ID` / `Retain ID`), and status is rendered inline within the Balance Due card (`ID Currently Held in Vault`).
  - **Clean Scrollable Accordions**: Vertical space reclaimed from the vault box expands `Receipt Breakdown` (`maxHeight: 280, overflowY: "auto"`) and `Transaction Ledger` (`maxHeight: 320, overflowY: "auto"`), both styled with slim, non-intrusive scrollbars. Receipt Breakdown retains pure financial ledger math (Base Subtotal, Transport, Discount, Late Fees, Grand Total, Total Paid) without redundant equipment duplicate tables.
  - **Collapsed Reviews Accordion**: Secondary review threads (`InvoiceReviewsSection`) at the bottom of the asset tracking board are wrapped in an accordion that is collapsed by default (`expanded={false}`), preventing feedback composer forms from consuming >50% of the middle viewport.
  - **Removed Redundant Controls**: Payment method selector buttons (`Cash`, `Card`, `Transfer`, `Cheque`) were removed to declutter the financial action area.
  - **Asset Board Focus**: Removed bill printing trace cards from the main board (`ManageLedgerPanel`) to keep line items and returns uncluttered. Bill printing is triggered via the single primary blue `Print POS Bill (INV-XX)` button in the Balance Due card, with full per-invoice history in `InvoicePrintHistoryDialog`.

## Viewport-Locked Tables & Global KPI Stats (`Customers.tsx` & `Equipment.tsx`)

- **100% Viewport Lock**: The outer page container uses `height: { xs: "auto", md: "calc(100vh - 88px)" }, overflow: { xs: "visible", md: "hidden" }, display: "flex", flexDirection: "column"`.
- **Fixed Upper Cards + Internal Table Scroll**: Header, KPI statistic cards, and search/filter bars have `flexShrink: 0`. The table card uses `flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden"`, and `<TableContainer sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}><Table stickyHeader>` scrolls only the `<tbody>` while `<thead>` stays sticky.
- **Decoupled Global KPIs & Safe Unwrapping**: Upper KPI cards fetch true database-wide totals via `useCustomerStats()` (`/api/customers/stats`) and `useEquipmentStats()` (`/api/equipment/stats`) so filtering or paginating the table never distorts vault/fleet totals. Because `api` interceptor unwraps `response.data`, hooks must always safely extract `res?.data?.data ?? res?.data ?? res` to prevent fallback to zero values.
- **Mobile Responsive 2x2 Grid**: KPI grids use `size={{ xs: 6, sm: 6, md: 3 }}` on Customers and `size={{ xs: 12, sm: 4, md: 4 }}` (with 2x `xs: 6` cards) on Equipment, avoiding tall single-column card stacking on mobile phones and keeping data tables above the fold. Filter search bars and dropdowns wrap with `flex: { xs: "1 1 100%", sm: "initial" }`.

## Responsive Dashboard Engine & Customizer (`DashboardEngine.tsx` & `EditModePanel.tsx`)

- **100% Full-Width Screen Occupancy**: In view mode (`!isEditMode`), the dashboard uses native fluid CSS Grid (`gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }`), guaranteeing edge-to-edge coverage across all monitor resolutions without dead white space or RGL column mismatch issues.
- **Unified 4-Column Breakpoints in Edit Mode**: When edit mode is active, `ResponsiveGridLayout` uses `breakpoints={{ lg: 1200, md: 900, sm: 600, xs: 0 }}` and `cols={{ lg: 4, md: 4, sm: 4, xs: 4 }}` with measured `gridWidth`, ensuring cards never drop to 6 default columns on sub-900px widths.
- **Dual Drawer Dismissal**: `EditModePanel` features both a header close icon and a sticky bottom full-width `Done Customizing` button. Dismissing the drawer automatically resets `isEditMode: false` to seamlessly return the user to live view mode.

## Conventions

- **Hooks** wrap every API call. Pages should never call `api.get` directly — go through `useXxx()` in `features/<area>/hooks/`.
- **Mutations invalidate the right cache keys** (`qc.invalidateQueries({ queryKey: ['sa-tenant', tenantId] })`). When adding a status-changing mutation, also invalidate the **detail** view, not just the list.
- **Don't store derived values in Zustand** — derive in selectors.
- **Modals/dialogs** live alongside their parent (e.g. `TenantUserDialog.tsx` next to `TenantDetailPanel.tsx`).

## Common workflow patterns

- Adding a super-admin endpoint: hook in `features/super-admin/hooks/useSuperAdminHooks.ts` → component in `features/super-admin/components/` → wire from `src/routes/SuperAdmin.tsx`.
- Adding a tenant page: file in `src/routes/<Page>.tsx`, register under `_authenticated`, add to `allNavItems` in `_authenticated.tsx` with the right `requiredPermission`.

