# Vitalify Admin v2 — UX/UI Overhaul + CRUD Funcional

**Date:** 2026-04-14
**Status:** Approved
**Context:** La app tiene todas las pantallas scaffoldeadas (T01–T17) pero la UI es básica, los catálogos no son funcionales, y falta paginación, filtros y responsividad. Esta spec define la segunda oleada de trabajo: rediseño visual premium + funcionalidad CRUD completa.

---

## 1. Design System — Neon Dark

### Color Palette (dark mode only)

```
background:          #041210   (Deep Jungle Green)
foreground:          #FFFFFF
card:                #0B221E   (Slightly lighter jungle green)
card-foreground:     #FFFFFF
popover:             #0C2B27
popover-foreground:  #FFFFFF
primary:             #00FF9D   (Neon Green)
primary-foreground:  #041210
secondary:           #1A3835   (Muted green)
secondary-foreground:#FFFFFF
muted:               #1A3835
muted-foreground:    #8E9B99
accent:              #00FF9D
accent-foreground:   #041210
destructive:         #FF453A
destructive-foreground:#FFFFFF
border:              #1A3835
input:               #0C2B27
ring:                #00FF9D
```

### Implementation

- Replace all CSS variables in `globals.css` `:root` / `.dark` with the palette above.
- Remove light mode support — force `dark` in ThemeProvider `defaultTheme` and remove toggle.
- Replace all hardcoded `emerald-*` Tailwind classes in components with semantic CSS variables (`bg-primary`, `text-muted-foreground`, etc.).
- Sidebar uses `bg-card` instead of `bg-emerald-900`.

### Typography

- Font: Inter (already installed).
- Headings: `text-lg font-semibold` (pages), `text-sm font-medium` (sections).
- Labels in tables/cards: `text-[10px] uppercase tracking-wider text-muted-foreground`.
- Values: `text-xl font-bold` for metric cards.

---

## 2. Layout

### Sidebar

- **Default state (desktop ≥ 768px):** expanded at 180px with icon + label for each nav item.
- **Collapsed state:** 48px, icons only with tooltips on hover.
- **Toggle:** hamburger button at top of sidebar. State persisted in `usePreferencesStore` (localStorage).
- **Mobile (< 768px):** sidebar hidden by default. Hamburger in topbar opens it as a fixed overlay with dark backdrop (`bg-black/60`). Click outside or on a link closes it.
- **Visual structure:**
  - Logo row: `⚡ Vitalify` when expanded, just `⚡` when collapsed.
  - Nav items grouped: general items (Dashboard, Clientes, Pagos, Turnos) then separator then admin-only items (Planes, Ubicaciones, Reportes, Trabajadores, Terminal).
  - Active item: `bg-secondary` background, `text-primary` color.
  - Inactive items: `text-muted-foreground`, hover `text-foreground`.

### Topbar

- Fixed, height 48px, `bg-card` with `border-b border-border`.
- Left: location name + company name (`text-muted-foreground`).
- Right: shift badge (if active), "Abrir puerta" button, logout button.
- Theme toggle removed (dark only).
- On mobile: add hamburger button on the left.

### Content Area

- `padding: 16px` mobile, `24px` desktop.
- Forms: `max-width: 640px`.
- Tables: full width, horizontal scroll on mobile.

---

## 3. DataTable Improvements

### Pagination

- Bottom bar: "Mostrando 1–50 de 248" + prev/next buttons + page size selector (25/50/100).
- Keep client-side pagination (sufficient for gym-scale data: < 5000 rows).
- `pageSize` default: 50.

### Filters

- Global search input already exists — keep it.
- Add column-specific filters where useful:
  - **Clients:** status dropdown (Vigente / Vencido / Baja).
  - **Payments:** payment method dropdown, date range picker.
  - **Shifts:** status (Activo / Cerrado), date range.
  - **Reports:** month/year picker, location selector.
- Filters render as a horizontal bar above the table, below the title.

### Responsive Tables

- On screens < 768px: table wraps in `overflow-x-auto`.
- Sticky first column (name/ID) when scrolling horizontally.
- Reduce font sizes: `text-xs` in cells.

---

## 4. CRUD: Planes

### Current State
- `app/(dashboard)/plans/page.tsx` exists with a read-only table.
- `lib/supabase/actions/plans.ts` has `getPlans` and `upsertPlan`.

### Changes

**Table columns:** ID, Nombre, Duración, Precio, Nivel de acceso, Estado (activo/inactivo), Acciones.

**Estado toggle:** `Switch` component in the "Estado" column. Calls `togglePlanActive(planId, isActive)` server action. Plans table needs `is_active boolean DEFAULT true` column (migration).

**Create/Edit:** Modal dialog with form fields:
- name (text), duration (interval select: 1 día, 1 semana, 1 mes, 3 meses, 6 meses, 1 año), price (number), access_level (select: full/limited), access_start_time/access_end_time (time inputs, visible only if limited).

**Behavior:** Inactive plans don't appear in the Create Client plan selector. Existing subscriptions on inactive plans are unaffected.

### Migration Required

```sql
ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
```

---

## 5. CRUD: Ubicaciones

### Current State
- `app/(dashboard)/locations/page.tsx` exists with a read-only table.
- `lib/supabase/actions/locations.ts` has `getLocations` and `upsertLocation`.

### Changes

**Table columns:** ID, Nombre, Dirección, Acciones (Editar).

**Create/Edit:** Modal dialog (consistent with Plans). Fields: name (text), address (text).

No delete — locations have FK references.

---

## 6. CRUD: Workers

### Current State
- `app/(dashboard)/workers/page.tsx` exists with a read-only table.
- `lib/supabase/actions/workers.ts` has `getWorkers` and `inviteWorker`.

### Changes

**Table columns:** Email, Rol (Admin/Worker), Ubicación, Estado (Activo/Inactivo), Acciones.

**Invite Worker:** Modal with:
- email (text) — Supabase auth invite.
- role (select: admin/worker).
- location (select from company locations).
- Server action calls `supabase.auth.admin.inviteUserByEmail()` (requires `SUPABASE_SERVICE_ROLE_KEY` env var — server-side only) + inserts row in `user_access`.

**Edit:** Change role or location via inline select or modal.

**Deactivate:** Soft delete — remove from `user_access` table (user can no longer log in to this company). Confirmation dialog.

---

## 7. Create Client — Sheet Lateral (3 pasos)

### Container

- shadcn `Sheet` opening from the right, width `450px` (desktop), full-screen on mobile.
- Stepper header: 3 circles with labels (Datos → Biométricos → Plan), connected by lines. Active step highlighted in `primary`.
- Back/Next buttons at the bottom. "Crear cliente" on the last step.

### Step 1: Datos Personales

Fields (all required):
- Nombre (text)
- Apellido (text)
- Email (text, email validation)
- Teléfono (text)
- Fecha de nacimiento (date picker)
- Género (select: Masculino/Femenino/Otro)

Auto-sets `company_id` from auth store.

### Step 2: Biométricos

**Foto facial:**
- Webcam feed using `react-webcam` package (already in kraken-web).
- "Capturar" button takes screenshot → shows preview with "Repetir" option.
- Image stored as base64 in step state.

**Huella digital:**
- "Capturar huella" button → calls `Terminal.readFingerPrint()`.
- Shows quality indicator (Mala < 50 / Media < 80 / Buena ≥ 80) + fingerprint quality number.
- Both are required — Next button disabled until both are captured.

### Step 3: Plan y Pago

Fields:
- Plan (select — only active plans).
- Método de pago (select: Efectivo / Tarjeta / Transferencia).
- **If Transferencia:**
  - "Tomar foto de comprobante" — opens webcam to capture receipt image.
  - OR "Enviar desde celular" — shows a QR code. QR encodes a URL to a temporary upload endpoint. User scans with phone, takes photo, uploads. Image appears in the form automatically (via polling or WebSocket).

**Dates:** `start_date` = today, `end_date` = today + plan.duration (computed automatically, shown as read-only).

**Total:** Shows plan price (read-only).

### Submission Flow

1. Insert client in `clients` table → get `client_id`.
2. Upload face image to Supabase Storage → get `image_url` → update client.
3. Insert subscription in `subscriptions` table.
4. Insert payment in `payments` table (with `shift_id` if worker has active shift).
5. Call `Terminal.createPerson()` with client data.
6. Call `Terminal.setUpFaceImage()` with client ID + image URL.
7. Call `Terminal.setUpFingerPrint()` with client ID + fingerprint data.
8. Call `Terminal.updateEndDate()` with client ID + end date.
9. Close sheet, refresh clients table, show success toast.

### Error Handling

- If terminal calls fail: show warning toast but don't block client creation (client exists in DB). Offer "Reintentar sincronización con terminal" button.
- If DB insert fails: show error, stay on current step.

---

## 8. Terminal Configuration

### Current State
- `app/(dashboard)/terminal/page.tsx` exists but is a basic placeholder.
- `lib/terminal.ts` exists but doesn't read from localStorage like kraken-web's version.

### Changes

**Page UI:** Card with 4 form fields:
- Agent IP (URL of the local Hikvision agent, e.g., `http://localhost:8000`)
- Terminal IP (IP of the Hikvision terminal)
- Terminal Username (default: `admin`)
- Terminal Password (default: `admin`, type=password)

"Guardar configuración" button → saves to localStorage.
"Probar conexión" button → calls `Terminal.getCapabilities()` and shows success/error.

**Terminal class update:** Update `lib/terminal.ts` to match kraken-web's class exactly:
- Read `agentIp`, `terminalIp`, `terminalUsername`, `terminalPassword` from localStorage.
- All methods: `getCapabilities`, `readFingerPrint`, `createPerson`, `setUpFingerPrint`, `setUpFaceImage`, `updateEndDate`, `openDoor`, `deleteUser`.
- Remove the API route proxy approach — call the agent directly from the client (same as kraken-web does).

---

## 9. Reports Improvements

### Reports Index

Keep the card grid layout but update to neon dark palette. Only "Pagos Mensuales" is functional; the rest show "Próximamente" badge.

### Monthly Payments Report

- **Filters bar:** Month/Year selector (dropdown or date picker), Location selector (dropdown).
- **Summary cards:** Total ingresos, Efectivo, Tarjeta, Otros.
- **Table:** Date, Client, Plan, Amount, Method — with pagination.
- **Export:** "Exportar CSV" button that downloads filtered data.

---

## 10. Responsive Design

### Breakpoints

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | < 768px | Sidebar overlay, 1-col cards, full-width sheet, `text-xs` tables |
| Tablet | 768–1024px | Sidebar collapsible, 2-col cards, side sheet |
| Desktop | > 1024px | Sidebar expanded, 3-col cards, side sheet 450px |

### Key Adaptations

- **MetricCard grid:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
- **Tables:** `overflow-x-auto` wrapper, `min-w-[600px]` on table to force scroll.
- **Forms in modals:** Stack to single column on mobile.
- **Sheet (Create Client):** `w-full sm:w-[450px]`.
- **Sidebar:** `fixed` positioning with `z-40`, backdrop on mobile.

---

## 11. New Dependencies

| Package | Purpose |
|---|---|
| `react-webcam` | Camera capture for face photo and receipt |
| `qrcode.react` | QR code generation for receipt upload from phone |
| `date-fns` | Date arithmetic for subscription end date calculation |

---

## 12. Database Migrations

```sql
-- Plans active toggle
ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
```

No other schema changes needed.

---

## 13. Agent Assignment

### Gemini — UX/UI (visual + CSS work)

- Theme: globals.css CSS variables, remove emerald hardcodes
- Sidebar redesign: expanded/collapsed/mobile
- Topbar redesign: neon dark, remove theme toggle
- DataTable: pagination UI, filter bar, responsive scroll
- MetricCard: update to neon dark
- Reports index: card grid with neon palette
- Login page: update to neon dark palette
- All pages: responsive breakpoints, spacing, typography

### Codex — Backend + CRUD logic

- Plans: `togglePlanActive` server action, create/edit modal logic, migration
- Locations: edit modal/inline logic
- Workers: invite flow (Supabase auth invite + user_access insert), edit role, deactivate
- Terminal class: full rewrite matching kraken-web
- Terminal config page: save/load localStorage, test connection
- Monthly reports: filter server actions, CSV export
- Receipt QR upload endpoint

### Claude — Complex features (orchestration + wizard)

- Create Client Sheet: 3-step wizard container, stepper component
- Step 2 biometrics: webcam + fingerprint integration
- Step 3 payment: receipt capture (webcam + QR flow)
- Submission flow: orchestrate all DB inserts + terminal sync
- DataTable pagination logic (pageSize state, slice, controls)
- Error handling patterns (terminal fail recovery)

---

## 14. Task Order

**Wave 1 — Foundation (no dependencies between tasks):**
- Theme CSS variables
- Terminal class rewrite
- Plans migration + server action
- DataTable pagination component

**Wave 2 — CRUD pages (depends on theme + DataTable):**
- Plans CRUD page
- Locations CRUD page
- Workers CRUD page
- Terminal config page
- Sidebar + Topbar redesign
- All pages responsive pass

**Wave 3 — Create Client (depends on terminal class + plans CRUD):**
- Create Client Sheet container + stepper
- Step 1 form
- Step 2 biometrics
- Step 3 plan + payment + receipt
- Submission flow

**Wave 4 — Polish:**
- Reports improvements
- Login page redesign
- QR receipt upload endpoint
- CSV export
- End-to-end testing
