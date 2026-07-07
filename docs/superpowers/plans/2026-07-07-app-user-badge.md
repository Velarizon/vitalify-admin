# App User Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a badge on each row in `/clients` indicating whether that member has a Vitalify app account, by persisting the trainer-app's `clientId` locally on successful enrollment.

**Architecture:** Add a nullable `vitalify_client_id` column to the local `clients` table. `POST /api/vitalify/enroll-member` (the single shared endpoint used by all three enrollment entry points) writes that column after a successful `createGymMember()` call, using the local client id the caller now sends alongside the existing fields. The clients table UI reads the column (already returned by the existing `select('*')` query) and renders a `Badge` when it's set.

**Tech Stack:** Next.js 15 App Router, Supabase (Postgres + supabase-js), TypeScript, shadcn/ui `Badge`, lucide-react.

## Global Constraints

- Cross-project reference: `vitalify_client_id` stores a `User.id`/client id from the **separate** trainer-app Supabase project (same pattern as `companies.vitalify_id`) — it is not a real FK, per existing migration `supabase/migrations/20260618120000_add_vitalify_columns_to_companies.sql`.
- `types/supabase.ts` is generated and this project's convention (documented in CLAUDE.md, "is_active en planes") is to NOT hand-edit it for columns the generator hasn't picked up — extend the narrower local row type instead (see `PlanRow` in `lib/supabase/browser-catalogs.ts:16-18`) and cast `as any` on the specific `.select()`/`.update()` call, matching how `companies.vitalify_id` is already read in `app/api/vitalify/enroll-member/route.ts`.
- This repo has no test coverage for API routes or React table/UI code (only two pure-function unit test files exist, under `lib/__tests__/`). Introducing a Supabase/Next-request mocking harness for this one route would be new scaffolding this codebase doesn't otherwise use. Per-task verification here is `npx tsc --noEmit` plus a manual walkthrough in the final task — do not add a mocking framework.

---

### Task 1: Migration — add `vitalify_client_id` to `clients`

**Files:**
- Create: `supabase/migrations/20260707120000_add_vitalify_client_id_to_clients.sql`

**Interfaces:**
- Produces: DB column `clients.vitalify_client_id integer` (nullable), consumed by Task 2 (write) and Task 4 (read).

- [ ] **Step 1: Write the migration**

```sql
-- Vitalify (trainer-app) enrollment marker on clients.
-- Cross-project reference: vitalify_client_id is a client id that lives in the SEPARATE
-- trainer-app Supabase project (xeqshloypmfrlmrutmgf), so it is NOT a real FK.
-- A non-null value means this client has a Vitalify app account.
alter table clients
  add column if not exists vitalify_client_id integer;

comment on column clients.vitalify_client_id is 'Client id in the trainer-app project (xeqsh...) once enrolled in the Vitalify app. Cross-project reference, not a FK. NULL = not enrolled.';
```

- [ ] **Step 2: Apply the migration to the local/dev Supabase project**

Run: `supabase db push`
Expected: output lists `20260707120000_add_vitalify_client_id_to_clients.sql` as applied, no errors.

- [ ] **Step 3: Verify the column exists**

Run: `supabase db diff --schema public` (or open Supabase Studio → Table Editor → `clients`)
Expected: no pending diff for this column (schema matches the migration); `clients` table shows `vitalify_client_id` as a nullable `int4` column.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260707120000_add_vitalify_client_id_to_clients.sql
git commit -m "feat: add vitalify_client_id column to clients"
```

---

### Task 2: Persist `vitalify_client_id` on successful enroll

**Files:**
- Modify: `app/api/vitalify/enroll-member/route.ts` (full file, ~52 lines)

**Interfaces:**
- Consumes: DB column from Task 1 (`clients.vitalify_client_id`); `createGymMember()` from `lib/vitalify/trainer-app.ts`, which returns `CreateGymMemberResult { clientId: number, auth: {...} }` (unchanged, already in use).
- Consumes: new request body field `localClientId?: number` — the admin's own `clients.id` for the member being enrolled (sent by Task 3's callers).
- Produces: same response shape as before (`{ clientId, temporaryPassword, passwordWasGenerated, isNewAuthUser }`) — unchanged, so no caller-side response parsing breaks if this task ships alone.

- [ ] **Step 1: Update the route to accept `localClientId` and persist it after enrollment succeeds**

Replace the full contents of `app/api/vitalify/enroll-member/route.ts` with:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createGymMember } from '@/lib/vitalify/trainer-app'

export const runtime = 'edge'

// Enrolls a gym member in the trainer-app project, linked to the gym's trainer
// (companies.vitalify_id). Requires the gym to be registered first.
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const {
      companyId, localClientId, firstName, lastName, email, phone,
      startDate, endDate, planDuration, amount, currency, paymentMethod,
    } = await request.json()
    if (!companyId) return NextResponse.json({ error: 'companyId requerido' }, { status: 400 })
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Nombre, apellido y email son requeridos' }, { status: 400 })
    }

    const { data: company, error: companyError } = await (supabase.from('companies') as any)
      .select('vitalify_id')
      .eq('id', companyId)
      .single()

    if (companyError) {
      return NextResponse.json({ error: companyError.message }, { status: 500 })
    }
    if (!company?.vitalify_id) {
      return NextResponse.json({ error: 'El gimnasio no está registrado en Vitalify' }, { status: 409 })
    }

    const result = await createGymMember({
      trainerId: company.vitalify_id,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: String(email).trim().toLowerCase(),
      phone: phone ?? null,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      planDuration: planDuration ?? null,
      amount: amount ?? null,
      currency: currency ?? 'MXN',
      paymentMethod: paymentMethod ?? null,
    })

    if (localClientId) {
      await (supabase.from('clients') as any)
        .update({ vitalify_client_id: result.clientId })
        .eq('id', localClientId)
    }

    return NextResponse.json({
      clientId: result.clientId,
      temporaryPassword: result.auth.temporaryPassword,
      passwordWasGenerated: result.auth.passwordWasGenerated,
      isNewAuthUser: result.auth.isNewAuthUser,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
```

`localClientId` is optional and the write is skipped (not failed) when absent, so this route stays backward-compatible for any caller that hasn't been updated yet.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors from `app/api/vitalify/enroll-member/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add app/api/vitalify/enroll-member/route.ts
git commit -m "feat: persist vitalify_client_id after successful app enrollment"
```

---

### Task 3: Send `localClientId` from all three enrollment entry points

**Files:**
- Modify: `components/clients/vitalify-enroll-dialog.tsx:68-73` (the POST body)
- Modify: `components/clients/renew-membership-dialog.tsx:167-183` (the POST body)
- Modify: `components/clients/create-client-wizard.tsx:117-133` (the POST body)

**Interfaces:**
- Consumes: `localClientId` field added to the request body in Task 2. All three files already have a `client` (or newly-created client) object with `.id` in scope at the call site.

- [ ] **Step 1: `vitalify-enroll-dialog.tsx` — add `localClientId` to the request body**

In `components/clients/vitalify-enroll-dialog.tsx`, change:

```ts
        body: JSON.stringify({
          companyId: userData.company.id,
          firstName: client.name ?? '',
          lastName: client.last_name ?? '',
          email: client.email,
          phone: client.phone_number ?? null,
        }),
```

to:

```ts
        body: JSON.stringify({
          companyId: userData.company.id,
          localClientId: client.id,
          firstName: client.name ?? '',
          lastName: client.last_name ?? '',
          email: client.email,
          phone: client.phone_number ?? null,
        }),
```

- [ ] **Step 2: `renew-membership-dialog.tsx` — add `localClientId` to the request body**

In `components/clients/renew-membership-dialog.tsx`, change:

```ts
            body: JSON.stringify({
              companyId: userData.company.id,
              firstName: client.name ?? '',
              lastName: client.last_name ?? '',
              email: client.email,
              phone: client.phone_number ?? null,
              startDate,
              endDate: endDateValue,
              planDuration: selectedPlan.duration ?? null,
              amount: MOBILE_APP_ADDON_PRICE, // Vitalify only charges the app add-on; the plan price is the gym's
              currency: 'MXN',
              paymentMethod,
            }),
```

to:

```ts
            body: JSON.stringify({
              companyId: userData.company.id,
              localClientId: client.id,
              firstName: client.name ?? '',
              lastName: client.last_name ?? '',
              email: client.email,
              phone: client.phone_number ?? null,
              startDate,
              endDate: endDateValue,
              planDuration: selectedPlan.duration ?? null,
              amount: MOBILE_APP_ADDON_PRICE, // Vitalify only charges the app add-on; the plan price is the gym's
              currency: 'MXN',
              paymentMethod,
            }),
```

- [ ] **Step 3: `create-client-wizard.tsx` — add `localClientId` to the request body**

In `components/clients/create-client-wizard.tsx`, change:

```ts
            body: JSON.stringify({
              companyId: userData.company.id,
              firstName: personal.name,
              lastName: personal.last_name,
              email: personal.email,
              phone: personal.phone_number,
              startDate: payment.start_date,
              endDate: payment.end_date,
              planDuration: plans.find(p => p.id === payment.plan_id)?.duration ?? null,
              amount: MOBILE_APP_ADDON_PRICE, // Vitalify only charges the app add-on; the plan price is the gym's
              currency: 'MXN',
              paymentMethod: payment.payment_method,
            }),
```

to:

```ts
            body: JSON.stringify({
              companyId: userData.company.id,
              localClientId: client.id,
              firstName: personal.name,
              lastName: personal.last_name,
              email: personal.email,
              phone: personal.phone_number,
              startDate: payment.start_date,
              endDate: payment.end_date,
              planDuration: plans.find(p => p.id === payment.plan_id)?.duration ?? null,
              amount: MOBILE_APP_ADDON_PRICE, // Vitalify only charges the app add-on; the plan price is the gym's
              currency: 'MXN',
              paymentMethod: payment.payment_method,
            }),
```

(The `client` variable here is the record created earlier in the same function by `createBrowserClientRecord(...)`, already used a few lines above at `create-client-wizard.tsx:108` for `updateBrowserClient(client.id, syncUpdates)`.)

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add components/clients/vitalify-enroll-dialog.tsx components/clients/renew-membership-dialog.tsx components/clients/create-client-wizard.tsx
git commit -m "feat: send local client id to enroll-member endpoint"
```

---

### Task 4: Show the badge in the clients table

**Files:**
- Modify: `lib/supabase/browser-catalogs.ts:6-14` (extend `ClientRow`)
- Modify: `app/(dashboard)/clients/page.tsx` (import + new column)

**Interfaces:**
- Consumes: `clients.vitalify_client_id` column from Task 1 (already returned by the existing `select('*', ...)` in `getBrowserClientsPage`/`searchBrowserClients` — no query change needed).
- Produces: `Client['vitalify_client_id']: number | null | undefined`, read by the new table column.

- [ ] **Step 1: Extend `ClientRow` with the new field**

In `lib/supabase/browser-catalogs.ts`, change:

```ts
type ClientRow = Database['public']['Tables']['clients']['Row'] & {
  is_sync?: boolean | null
  subscriptions?: {
    id: number
    plan_id: number | null
    start_date: string | null
    end_date: string | null
    plans?: { name: string | null } | null
  }[] | null
}
```

to:

```ts
type ClientRow = Database['public']['Tables']['clients']['Row'] & {
  is_sync?: boolean | null
  vitalify_client_id?: number | null
  subscriptions?: {
    id: number
    plan_id: number | null
    start_date: string | null
    end_date: string | null
    plans?: { name: string | null } | null
  }[] | null
}
```

- [ ] **Step 2: Import `Badge` in the clients page**

In `app/(dashboard)/clients/page.tsx`, change:

```ts
import { Button } from '@/components/ui/button'
```

to:

```ts
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
```

- [ ] **Step 3: Add the "App" column**

In `app/(dashboard)/clients/page.tsx`, in the `columns` array, change:

```ts
    {
      header: 'Vencimiento',
      cell: ({ row }) => {
        const endDate = row.original.subscriptions?.[0]?.end_date
        return (
          <span className="text-[10px] font-mono text-muted-foreground/80 tracking-tighter bg-secondary/30 px-2 py-0.5 rounded-sm">
            {endDate ? new Date(endDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : 'N/A'}
          </span>
        )
      },
    },
    {
      id: 'actions',
```

to:

```ts
    {
      header: 'Vencimiento',
      cell: ({ row }) => {
        const endDate = row.original.subscriptions?.[0]?.end_date
        return (
          <span className="text-[10px] font-mono text-muted-foreground/80 tracking-tighter bg-secondary/30 px-2 py-0.5 rounded-sm">
            {endDate ? new Date(endDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : 'N/A'}
          </span>
        )
      },
    },
    {
      header: 'App',
      cell: ({ row }) => (
        row.original.vitalify_client_id
          ? (
            <Badge className="bg-primary text-primary-foreground text-[9px] uppercase tracking-widest h-4 gap-1">
              <Smartphone className="h-2.5 w-2.5" /> App
            </Badge>
          )
          : null
      ),
    },
    {
      id: 'actions',
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/browser-catalogs.ts "app/(dashboard)/clients/page.tsx"
git commit -m "feat: show app-enrollment badge in clients table"
```

---

### Task 5: Manual end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: server starts without errors.

- [ ] **Step 2: Confirm existing (unenrolled) clients show no badge**

In the browser, open `/clients` for a company where at least one member has never used the "App" enroll button. Confirm that row has no "App" badge in the new column, and the row's "App" action button still appears as before (its own visibility is unchanged — still gated on `gymRegistered && row.original.email`).

- [ ] **Step 3: Enroll a client and confirm the badge appears**

For a gym-registered company (`gymRegistered === true`), click "App" on a client row, complete the enroll dialog. After it succeeds and the list reloads (existing `onSuccess`/`load()` callback), confirm that row now shows the "App" badge.

- [ ] **Step 4: Confirm the DB was updated**

In Supabase Studio, open the `clients` table and confirm the enrolled client's row has a non-null `vitalify_client_id` matching the `clientId` returned in the network response from step 3 (check via browser devtools Network tab on the `enroll-member` request).

- [ ] **Step 5: Repeat for the renew-membership and create-client-wizard flows**

Renew a client's membership with the "add mobile app" option checked, and separately create a brand-new client with the mobile app add-on. Confirm both end up with the badge after their respective success flows.
