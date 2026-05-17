# GearGrid Frontend

Vite + React 18 + TypeScript. Pairs with the `revampedBackend` repo.

## Stack — what's actually here

- **Routing**: TanStack Router (file-based in `src/routes/`)
- **Data**: TanStack Query v5 (queryClient in `src/app/queryClient.ts`)
- **Forms**: react-hook-form + Zod (`@hookform/resolvers/zod`)
- **State**: Zustand (`src/stores/useAuthStore.ts`, `useUiStore.ts`) — `useAuthStore` is **persisted** to localStorage under `geargrid-auth-storage`
- **UI**: **MUI v9** + Emotion. Tailwind utility classes also appear (don't add more — prefer MUI `sx`)
- **HTTP**: axios via `src/lib/api.ts`. The response interceptor returns `response.data` directly, so hooks receive the unwrapped body (e.g. `{ status, data }`), not the Axios wrapper.

## Commands

| Task | Command |
|---|---|
| Dev server | `npm run dev` (port 5173) |
| Type check | `npx tsc --noEmit` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Backend API | set `VITE_API_URL=http://localhost:8086/api` in `.env.local` |

## Definition of done

1. **Type check passes** — `npx tsc --noEmit`. There are a few pre-existing errors in `_authenticated.tsx` and `RentalHistory.tsx` (MUI v9 `primaryTypographyProps` / polymorphic `component={Link}` patterns). **Don't fix them mid-feature**; only touch when explicitly cleaning up that file.
2. **Test the change in the browser**, not just the type checker. Vite HMR catches most things; full reload after auth-related changes.
3. **For super-admin work**: cookies have `sameSite: 'none'` + `secure: true` in dev, so the dev server must speak HTTPS or you'll need to keep it on `http://localhost`.

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

## API patterns

- `api.ts` interceptor unwraps `response.data`. Hook signatures look like:
  ```ts
  const res = await api.get('/super-admin/tenants');
  return res.data.tenants as Tenant[];   // res is already response.data
  ```
- File uploads: build a `FormData`, pass `headers: { 'Content-Type': 'multipart/form-data' }`. See `useUploadTenantLogo`.
- Tenant data JSON fields (`branding`, `feature_flags`, `cors_whitelist`) come back as real objects/arrays — backend normalizes. There's still a `parseJson()` guard in `TenantDetailPanel.tsx`; keep it as belt-and-braces.

## Conventions

- **Hooks** wrap every API call. Pages should never call `api.get` directly — go through `useXxx()` in `features/<area>/hooks/`.
- **Mutations invalidate the right cache keys** (`qc.invalidateQueries({ queryKey: ['sa-tenant', tenantId] })`). When adding a status-changing mutation, also invalidate the **detail** view, not just the list.
- **Don't store derived values in Zustand** — derive in selectors.
- **Modals/dialogs** live alongside their parent (e.g. `TenantUserDialog.tsx` next to `TenantDetailPanel.tsx`).

## Common workflow patterns

- Adding a super-admin endpoint: hook in `features/super-admin/hooks/useSuperAdminHooks.ts` → component in `features/super-admin/components/` → wire from `src/routes/SuperAdmin.tsx`.
- Adding a tenant page: file in `src/routes/<Page>.tsx`, register under `_authenticated`, add to `allNavItems` in `_authenticated.tsx` with the right `requiredPermission`.
