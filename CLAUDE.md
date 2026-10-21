# CLAUDE.md — GearGrid Core SaaS & POS Frontend (`revampedFrontend`)

> **Application Identity:** Enterprise B2B Equipment Rental, POS Invoicing, Inventory Management, Workforce RBAC, Financial Analytics, and Super Admin SPA for GearGrid.
> **Tech Stack:** Vite 8 (Rolldown bundler), React 19, TypeScript 5.8, Material UI (MUI) v9 + `@mui/x-data-grid`, Tailwind CSS (`important: "#root"`), TanStack Router v1, TanStack React Query v5, Zustand v5, Framer Motion v12, i18next (`en` & `si`), Socket.IO Client, Vitest + React Testing Library.
> **Default Port:** `5173` (`http://localhost:5173` locally, `https://app.geargrid.live` in production).

---

## 1. Essential Commands & Mandatory Pre-Commit Gates

```bash
# Development
npm run dev                           # Start Vite 8 dev server on http://localhost:5173

# Mandatory Verification Gates (Run ALL 3 before completing any frontend task)
npx tsc --noEmit | grep "TS2304"      # Gate 1: Must output 0 lines (prevents runtime ReferenceError)
npm run build                         # Gate 2: Vite 8 Rolldown bundle (verifies strict ESM icon exports)
npm test -- --run                     # Gate 3: Run all 8 Vitest component/unit suites (23+ tests)
```

---

## 2. Directory & Feature Architecture

```
revampedFrontend/
├── src/
│   ├── main.tsx                      # React 19 root mount, QueryClientProvider, Theme, i18n init
│   ├── routeTree.gen.ts              # Auto-generated TanStack Router file-based route tree
│   ├── components/
│   │   ├── layout/                   # AppShell, Sidebar, TopBar, NotificationBell, LanguageSwitcher
│   │   └── ui/                       # Shared Enterprise UI Primitives:
│   │       ├── ResponsiveKpiStrip.tsx# Desktop 4-col grid -> Mobile ~70px swipeable snap-scroll strip
│   │       ├── KpiTile.tsx           # Interactive status filter metric card with tabular-nums
│   │       ├── ReportShell.tsx       # Standardized report page frame with export & date filtering
│   │       ├── StatTable.tsx         # Auto-height DataGrid wrapper with mobile overflow support
│   │       ├── TrendChart.tsx        # Recharts responsive area/bar chart wrapper
│   │       └── DateRangeFilter.tsx   # Preset & custom date range selector
│   ├── features/                     # Domain-Driven Feature Modules
│   │   ├── auth/                     # Login form, session hydration, permission guards
│   │   ├── dashboard/                # Customizable role-based DashboardEngine & KPI widgets
│   │   ├── invoices/                 # POS 3-Pane Workbench (Dispatch & Manage Orders)
│   │   │   ├── components/
│   │   │   │   ├── PosCustomerPanel.tsx      # Left Pane (Dispatch): Customer search, 3-col KPI stats, cached invoice history list
│   │   │   │   ├── PosLedgerPanel.tsx        # Center Pane (Dispatch): Equipment search, cart lines, rental days & rates
│   │   │   │   ├── PosCheckoutPanel.tsx      # Right Pane (Dispatch): Totals, deposit wallet, payment method, ID vault, dispatch CTA
│   │   │   │   ├── ManageInvoiceViews.tsx    # 3-Pane Manage Orders: ManageSearchPanel, ManageLedgerPanel, ManageFinancialPanel
│   │   │   │   ├── ReadOnlyInvoiceModal.tsx  # Non-editable popup modal showing complete invoice breakdown + thermal print CTA
│   │   │   │   ├── ReturnSettlementDialog.tsx# Partial/full return wizard with damage fee & deposit deduction math
│   │   │   │   ├── QuantityReturnSplitter.tsx# Good vs Damaged quantity slider for multi-unit line returns
│   │   │   │   ├── ReceiptPrintDialog.tsx    # Thermal receipt preview + local Print Agent (127.0.0.1:17888) + browser print fallback
│   │   │   │   └── InvoiceReceipt.tsx        # 80mm (72mm printable) thermal receipt layout component
│   │   │   └── hooks/
│   │   │       ├── useInvoiceHooks.ts        # useInvoiceList (with status counts), useInvoiceDetails, optimistic useToggleVault
│   │   │       └── usePosSearch.ts           # usePosCustomerSearch (pre-loads 15, skip_count=true, 5m cache), usePosEquipmentSearch
│   │   ├── customers/                # Customer directory, NIC photo upload, blacklist, useCustomerInvoices (5m cache)
│   │   ├── equipment/                # Inventory DataGrid, category dynamic specs, serial tracking, QR/barcode
│   │   ├── maintenance/              # Defect logs, repair status transitions, write-offs
│   │   ├── accounting/               # Operational expenses, net cashflow ledger
│   │   ├── reports/                  # 6 Report Hubs: Overview, Financial, Equipment, Customers, Invoices, Print Audit
│   │   ├── bulk-jobs/                # DataArena: CSV/XLSX bulk import (with dry-run preview modal) & streaming export
│   │   ├── users/                    # Workforce management, role assignment, permission override matrix
│   │   └── super-admin/              # Platform control plane: Tenant provisioning, subscriptions, impersonation, audit logs
│   ├── lib/
│   │   ├── api.ts                    # Axios instance with Bearer token injection & automatic response.data unwrapping
│   │   ├── printAgent.ts             # Local thermal print daemon client (127.0.0.1:17888 / 17420) + audit logger
│   │   └── socket.ts                 # Authenticated Socket.IO singleton client
│   ├── routes/                       # TanStack file-based routes (_authenticated.tsx, Invoices.tsx, Equipment.tsx, etc.)
│   └── stores/                       # Zustand state stores
│       ├── authStore.ts              # Persisted user, token, tenant info, & hasPermission() helper (geargrid-auth-storage)
│       ├── posStore.ts               # Active POS cart state, selectedCustomer, discount, deposit, ID retention flags
│       └── themeStore.ts             # Dark / Light mode toggle state
```

---

## 3. Core Frontend Engineering Rules & Patterns

### Rule 1: Axios Response Unwrapping (`src/lib/api.ts`)
- `api.ts` has a response interceptor: `api.interceptors.response.use((response) => response.data)`.
- **DO:**
  ```ts
  const data = await api.get('/customers', { params });
  return data; // Already unwrapped!
  ```
- **DON'T:** Never write `const res = await api.get(...); return res.data;` (this returns `undefined` unless the backend payload itself has a nested `.data` property).

### Rule 2: POS Customer Search, Caching & Read-Only Invoice Modal
- **Instant Customer Pre-Loading (`usePosCustomerSearch` in `src/features/invoices/hooks/usePosSearch.ts`):**
  - Pre-loads the top 15 customers immediately on POS mount even when the search input is empty (`""`).
  - Uses `200ms` debounce on typing, passes `skip_count: true` to skip backend `COUNT(*)` overhead, and sets `staleTime: 5 * 60 * 1000` (5 minutes) + `placeholderData: (prev) => prev`.
- **Customer Invoice History & Stats (`useCustomerInvoices` in `src/features/customers/hooks/useCustomerHooks.ts`):**
  - Calls `GET /api/customers/:id/invoices` with `staleTime: 5 * 60 * 1000`.
  - Powers the 3-column KPI strip (`Invoices`, `Pending`, `Completed`) and the clickable past-invoices list inside `PosCustomerPanel.tsx`.
  - Invalidated automatically on invoice creation (`useCreateInvoice`), return settlement (`useReturnInvoice`), and payment recording (`useAddPayment`).
- **Read-Only Invoice Preview (`ReadOnlyInvoiceModal.tsx`):**
  - Clicking any invoice in `PosCustomerPanel` opens `ReadOnlyInvoiceModal`, displaying complete customer info, ID vault badge, itemized equipment lines (returned/damaged counts), financial breakdown, payment history, and a one-click **Print Receipt** button. Optimized for mobile with `fullScreen` on `xs` viewports.

### Rule 3: Manage Orders Status Counts & Optimistic ID Vault Toggle
- **Accurate Status Counts (`ManageSearchPanel` in `ManageInvoiceViews.tsx`):**
  - Never compute tab badge counts from `invoices.length` (which is clamped by pagination `limit=20`).
  - Always bind tab badges (`All`, `Active`, `Completed`) to `data.counts.all`, `data.counts.active`, and `data.counts.completed` returned by `GET /api/invoices`, and provide the **Load More Invoices** button when `invoices.length < total`.
- **Optimistic ID Vault Toggle (`useToggleVault` in `useInvoiceHooks.ts`):**
  - Toggling physical ID retention (`PATCH /api/invoices/:id/vault`) uses TanStack Query's `onMutate` to flip `is_id_retained_currently` and `id_card_status` (`RETAINED` $\leftrightarrow$ `RETURNED`) in both `["invoices", "detail", id]` and `["invoices", "list"]` caches within $<16\text{ms}$, rolling back via `onError` if the network call fails.

### Rule 4: Zero Undeclared Identifiers (`TS2304`) & Vite 8 Rolldown Icon Exports
- **Why:** Vite's dev transform strips TypeScript types without checking if JSX components (`Chip`, `Typography`, `Badge`, `Divider`, `Tooltip`) are imported. An unimported component compiles in dev but crashes the user's browser with `ReferenceError: Chip is not defined`.
- **Rolldown Named Export Strictness:** Vite 8 uses Rolldown for production builds, which fails hard if an icon name does not exist in `@mui/icons-material`.
  - Use `CheckCircleOutlined` (NOT `CheckCircleOutline`).
  - Use `ErrorOutlined` (NOT `ErrorOutline`).
- **Mandatory Check:** Always run `npx tsc --noEmit | grep "TS2304"` and `npm run build` after editing any `.tsx` file.

---

## 4. UI/UX Design System Rules (Mandatory)

Full documentation in [`docs/UI_UX_KNOWLEDGE_BASE/INDEX.md`](file:///Users/theeka/GearGrid%20System/docs/UI_UX_KNOWLEDGE_BASE/INDEX.md) and [`.agents/rules/ui-ux-design-system.md`](file:///Users/theeka/GearGrid%20System/.agents/rules/ui-ux-design-system.md):

1. **MUI v9 `slotProps` Only:**
   - Replace all deprecated `InputProps`, `inputProps`, `PaperProps`, `SelectProps` with `slotProps={{ input: {...}, htmlInput: {...}, paper: {...} }}`.
2. **High-Contrast Input & Surface Coupling (Zero White-on-White Text):**
   - Never hardcode `const isDark = ... || true` or force `#f8fafc` text without setting a dark background surface.
   - Light surfaces (`#ffffff`, `#f8fafc`) MUST use dark slate text (`#0f172a`) and `#475569` labels.
   - Dark surfaces (`#0f172a`, `#1e293b`) MUST use light text (`#f8fafc`) and `#94a3b8` labels.
3. **Tabular Numerics (`tabular-nums`):**
   - Enforce `fontVariantNumeric: "tabular-nums"` on every currency amount, count, invoice number, phone number, serial code, and timestamp.
4. **DataGrid Auto Row Height (Never `density="compact"`):**
   - Always configure `getRowHeight={() => "auto"}`, `getEstimatedRowHeight={() => 56}`, and `.MuiDataGrid-row: { minHeight: "56px !important" }` so multi-line cells, chips, and avatars never clip vertically.
5. **Intermediate Flex Parents (`minHeight: 0`):**
   - Every intermediate flex column container inside a viewport-locked (`100vh`) page must declare `minHeight: 0` so inner scrollable lists (`overflowY: "auto"`) work properly.
6. **Mobile Viewport Optimization (`ResponsiveKpiStrip`):**
   - Never stack 4 KPI cards vertically on mobile (`xs`). Use `ResponsiveKpiStrip` (horizontal snap-scroll strip on `xs`, 4-column grid on `md+`) and horizontal scrolling filter chips (`flexWrap: { xs: "nowrap", sm: "wrap" }`).

---

## 5. Thermal Printing & Print Audit Architecture

1. **Pre-Print Audit Logging:**
   - Whenever a user clicks Print in `ReceiptPrintDialog.tsx` or `ReadOnlyInvoiceModal.tsx`, the frontend calls `POST /api/invoices/print-logs` (`src/lib/printAgent.ts` / `useLogInvoicePrint`).
   - Backend automatically classifies the first print of an invoice as `ORIGINAL` and all subsequent prints as `REPRINT`, visible at `/reports?category=audit`.
2. **Dual-Mode Printing:**
   - **Mode A (Silent Local Thermal Agent):** Sends structured receipt JSON/HTML to `http://127.0.0.1:17888/print` (`geargrid-print-agent`), which renders a dynamic-height `72mm x <H>mm` PDF via Headless Chrome and dispatches to CUPS `lp` for zero bottom paper waste.
   - **Mode B (Browser `@media print` Fallback):** If the local agent is offline, falls back cleanly to browser print of `#printable-area` (`InvoiceReceipt.tsx`).

---

## 6. Frontend Test Suite (`npm test -- --run`)

Located across `src/**/__tests__/`:
- `src/features/invoices/components/__tests__/ReadOnlyInvoiceModal.test.tsx`: Verifies modal rendering, customer details, line items, financial totals, and print callback.
- `src/features/invoices/components/__tests__/ManageInvoiceViews.test.tsx`: Verifies Manage Orders 3-pane rendering, status counts, and vault toggle interactions.
- `src/features/equipment/__tests__/EquipmentPage.test.tsx`: Verifies inventory table rendering and KPI filter strip.
- `src/features/customers/__tests__/CustomersPage.test.tsx`: Verifies customer directory and modal interactions.
- `src/components/ui/__tests__/ResponsiveKpiStrip.test.tsx`: Verifies responsive KPI strip rendering and collapse toggle.

---

## 7. Translations (English + Sinhala) — Mandatory for All UI Text

Never hardcode user-visible English. Every label, placeholder, toast, dialog and validation message goes through i18next (`src/i18n/locales/en.json` + `si.json`).

- **React:** `const { t } = useTranslation(); t("feature.Component.key")`. Plurals use `_one/_other`; markup uses `<Trans>`.
- **Module-level constants:** mark with `tk("key")` (`src/i18n/marker.ts`) and call `t(item.label)` at render. Zod schemas use `zt("validation.key")` (`src/i18n/zod.ts`). Non-React code uses `i18n.t(...)`.
- **Receipts** pick their own language: `t(key, { lng })`, independent of the UI language.
- **Workflow after writing new English text:**
  ```bash
  npm run i18n:extract -- --write   # converts new hardcoded strings to keys (then review the diff)
  npm run i18n:translate -- --write # Claude fills missing Sinhala, using src/i18n/glossary.json
  npm run i18n:check                # missing keys, placeholder mismatches, unused keys — must show 0 errors
  ```
  `npm run i18n:translate` without `--write` is a dry run listing untranslated keys. Needs `ANTHROPIC_API_KEY` (or `ant auth login`).
- **Vocabulary:** change a term app-wide by editing `src/i18n/glossary.json`, then re-translate affected keys with `--redo=<prefix>`.
- `src/i18n/__tests__/locales.test.ts` fails CI if any English key lacks Sinhala or placeholders differ.
- Machine-translated Sinhala should be skimmed by a native speaker before release.
