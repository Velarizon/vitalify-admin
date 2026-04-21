# Payment Type Classification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar clasificación automática de pagos como "nueva inscripción" o "renovación" para métricas de retención de clientes, sin breaking changes.

**Architecture:** Campo nullable `payment_type` en tabla payments, lógica de detección automática en createPayment() que consulta historial del cliente, visualización con badges y métricas agregadas en reportes.

**Tech Stack:** Supabase PostgreSQL, TypeScript Server Actions, React + TanStack Table, Vitest

---

## File Structure

**Backend:**
- Modify: `lib/supabase/actions/payments.ts` — agregar lógica de detección en createPayment()
- Modify: `types/supabase.ts` — agregar payment_type a tipos de payments

**Frontend:**
- Modify: `app/(dashboard)/reports/monthly-payments/page.tsx` — badges + métricas + export CSV
- Modify: `app/(dashboard)/shifts/[id]/page.tsx` — badges + métricas en detalle de turno

**Database:**
- Run: SQL migration para agregar columna payment_type

---

## Task 1: Database Migration

**Files:**
- SQL migration (manual via Supabase dashboard o CLI)

- [ ] **Step 1: Conectar a Supabase**

Abrir Supabase dashboard → proyecto → SQL Editor, o usar CLI:
```bash
npx supabase db diff --use-migra
```

- [ ] **Step 2: Ejecutar migration**

```sql
-- Add payment_type column to payments table
ALTER TABLE payments 
ADD COLUMN payment_type TEXT NULL;

-- Add comment for documentation
COMMENT ON COLUMN payments.payment_type IS 'Payment classification: new_subscription | renewal | NULL';
```

Expected: Migration succeeds, column added without errors

- [ ] **Step 3: Verificar columna**

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payments' AND column_name = 'payment_type';
```

Expected: Returns one row with `payment_type | text | YES`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): add payment_type column to payments table

Add nullable payment_type column for classifying payments as new
subscriptions vs renewals. Existing payments remain NULL.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `types/supabase.ts:188-218`

- [ ] **Step 1: Locate payments type definition**

Open `types/supabase.ts` and find the `payments` table definition (around line 188)

- [ ] **Step 2: Add payment_type to Row**

Find the `Row` type inside `payments` and add:

```typescript
payment_type: string | null
```

After `registered_by: string | null` (line 197)

- [ ] **Step 3: Add payment_type to Insert**

Find the `Insert` type inside `payments` and add:

```typescript
payment_type?: string | null
```

After `registered_by?: string | null` (line 207)

- [ ] **Step 4: Add payment_type to Update**

Find the `Update` type inside `payments` and add:

```typescript
payment_type?: string | null
```

After `registered_by?: string | null` (line 217)

- [ ] **Step 5: Verify no TypeScript errors**

Run type check:
```bash
npx tsc --noEmit
```

Expected: No errors related to payments types

- [ ] **Step 6: Commit**

```bash
git add types/supabase.ts
git commit -m "feat(types): add payment_type to payments table types

Add payment_type field (string | null) to payments Row, Insert, and
Update types for classification support.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Add Payment Type Detection Logic

**Files:**
- Modify: `lib/supabase/actions/payments.ts:54-78`

- [ ] **Step 1: Read current createPayment implementation**

Open `lib/supabase/actions/payments.ts` and review `createPayment()` function (lines 54-78)

Current signature:
```typescript
export async function createPayment(payment: {
  subscription_id: number
  amount: number
  payment_method: string
  location_id: number
  shift_id?: number | null
  registered_by?: string | null
})
```

- [ ] **Step 2: Add payment type detection logic before insert**

Replace the `createPayment` function body with:

```typescript
export async function createPayment(payment: {
  subscription_id: number
  amount: number
  payment_method: string
  location_id: number
  shift_id?: number | null
  registered_by?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Detect payment type based on client subscription history
  let paymentType: string | null = null

  if (payment.subscription_id) {
    // Get client_id from subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('client_id')
      .eq('id', payment.subscription_id)
      .single()

    if (subscription?.client_id) {
      // Check if client has any previous subscriptions
      const { count } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', subscription.client_id)
        .neq('id', payment.subscription_id)

      paymentType = (count && count > 0) ? 'renewal' : 'new_subscription'
    }
  }

  const { data, error } = await supabase
    .from('payments')
    .insert({
      ...payment,
      payment_date: new Date().toISOString(),
      registered_by: user?.id ?? null,
      payment_type: paymentType,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/payments')
  return data
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No TypeScript errors

- [ ] **Step 4: Test locally - create payment for new client**

Run dev server:
```bash
npm run dev
```

Navigate to client registration wizard, create a new client with payment.
Check Supabase dashboard → payments table → payment_type should be `'new_subscription'`

- [ ] **Step 5: Test locally - create payment for existing client**

In the app, create a renewal payment for an existing client.
Check Supabase dashboard → payments table → payment_type should be `'renewal'`

- [ ] **Step 6: Commit**

```bash
git add lib/supabase/actions/payments.ts
git commit -m "feat(payments): add automatic payment type classification

Detect payment_type based on client subscription history:
- new_subscription: client's first subscription
- renewal: client has previous subscriptions
- null: payment without subscription_id

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Add Badge Column to Monthly Payments Report

**Files:**
- Modify: `app/(dashboard)/reports/monthly-payments/page.tsx:17-39`

- [ ] **Step 1: Import Badge component**

At the top of the file, add Badge to imports:

```typescript
import { Badge } from '@/components/ui/badge'
```

After line 7

- [ ] **Step 2: Add payment type column to columns array**

Find the `columns` definition (around line 17) and add new column after the payment_method column (after line 33):

```typescript
  {
    header: 'Tipo',
    accessorKey: 'payment_type',
    cell: ({ row }) => {
      const type = row.original.payment_type
      if (!type) return '—'
      if (type === 'new_subscription') {
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Nueva</Badge>
      }
      return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Renovación</Badge>
    },
  },
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Test in browser**

Run dev server, navigate to `/reports/monthly-payments`

Expected: New "Tipo" column appears with badges:
- Green "Nueva" for new subscriptions
- Blue "Renovación" for renewals
- "—" for NULL values

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/reports/monthly-payments/page.tsx
git commit -m "feat(reports): add payment type badge column to monthly payments

Add Tipo column with color-coded badges:
- Green badge for new subscriptions
- Blue badge for renewals
- Dash for unclassified payments

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Add Metrics by Type to Monthly Payments Report

**Files:**
- Modify: `app/(dashboard)/reports/monthly-payments/page.tsx:41-126`

- [ ] **Step 1: Calculate new/renewal totals**

Inside `MonthlyPaymentsPage()` component, after line 60 (after calculating `other`), add:

```typescript
  const newSubscriptions = payments
    .filter((payment) => payment.payment_type === 'new_subscription')
    .reduce((sum, payment) => sum + (payment.amount ?? 0), 0)

  const renewals = payments
    .filter((payment) => payment.payment_type === 'renewal')
    .reduce((sum, payment) => sum + (payment.amount ?? 0), 0)

  const classified = newSubscriptions + renewals
  const retentionRate = classified > 0 
    ? ((renewals / classified) * 100).toFixed(1) 
    : '0.0'
```

- [ ] **Step 2: Update JSX to add type metrics cards**

Find the metrics grid (around line 116) and replace with:

```typescript
      <div className="grid gap-3 sm:grid-cols-2 mb-3">
        <MetricCard title="Inscripciones Nuevas" value={fmt(newSubscriptions)} />
        <MetricCard title="Renovaciones" value={fmt(renewals)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Efectivo" value={fmt(cash)} />
        <MetricCard title="Tarjeta" value={fmt(card)} />
        <MetricCard title="Otros" value={fmt(other)} />
        <MetricCard title="Total ingresos" value={fmt(total)} />
      </div>

      {classified > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Tasa de renovación: {retentionRate}%
        </p>
      )}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Test in browser**

Navigate to `/reports/monthly-payments`

Expected:
- Two new cards at top: "Inscripciones Nuevas" and "Renovaciones"
- Four existing cards below: Efectivo, Tarjeta, Otros, Total
- Retention rate text below if there are classified payments

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/reports/monthly-payments/page.tsx
git commit -m "feat(reports): add payment type metrics to monthly report

Add two metric cards for new subscriptions and renewals, plus
retention rate calculation. Layout: type metrics first, then payment
method metrics.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Update CSV Export in Monthly Payments

**Files:**
- Modify: `app/(dashboard)/reports/monthly-payments/page.tsx:62-79`

- [ ] **Step 1: Add payment type helper function**

After the `paymentMethodConfig` definition (around line 31), add:

```typescript
const getPaymentTypeLabel = (type: string | null) => {
  if (!type) return 'Sin clasificar'
  if (type === 'new_subscription') return 'Nueva'
  return 'Renovación'
}
```

- [ ] **Step 2: Update exportCSV header**

Find the `exportCSV` function (around line 62) and update header line:

```typescript
    const header = 'Cliente,Plan,Monto,Método,Fecha y hora,Responsable,Tipo\n'
```

- [ ] **Step 3: Add tipo column to CSV rows**

In the `rows` mapping (around line 65), update the return statement:

```typescript
        const type = getPaymentTypeLabel(payment.payment_type)
        return `"${name}","${plan}",${payment.amount ?? 0},"${method}","${date}","${responsible}","${type}"`
```

Add this line before the existing return statement, and update the return to include `"${type}"` at the end

- [ ] **Step 4: Test CSV export**

In browser, navigate to `/reports/monthly-payments`, click "Exportar CSV"

Expected: CSV file downloads with "Tipo" column showing "Nueva", "Renovación", or "Sin clasificar"

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/reports/monthly-payments/page.tsx
git commit -m "feat(reports): add payment type column to CSV export

Include Tipo column in monthly payments CSV with values: Nueva,
Renovación, or Sin clasificar.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Add Badge Column to Shift Detail Page

**Files:**
- Modify: `app/(dashboard)/shifts/[id]/page.tsx:23-34`

- [ ] **Step 1: Import Badge component**

At top of file, add Badge to imports:

```typescript
import { Badge } from '@/components/ui/badge'
```

After line 10

- [ ] **Step 2: Add payment type column to columns array**

Find the `columns` definition (around line 23) and add after the payment_method column (after line 32):

```typescript
  {
    header: 'Tipo',
    accessorKey: 'payment_type',
    cell: ({ row }) => {
      const type = row.original.payment_type
      if (!type) return '—'
      if (type === 'new_subscription') {
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Nueva</Badge>
      }
      return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Renovación</Badge>
    },
  },
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Test in browser**

Navigate to `/shifts/[id]` for any shift with payments

Expected: "Tipo" column appears with same badge styling as monthly report

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/shifts/[id]/page.tsx
git commit -m "feat(shifts): add payment type badge column to shift detail

Add Tipo column with badges matching monthly payments report style.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Add Type Metrics to Shift Detail Page

**Files:**
- Modify: `app/(dashboard)/shifts/[id]/page.tsx:76-97`

- [ ] **Step 1: Calculate new/renewal totals**

Inside the component return statement, after the shift/payments destructuring (around line 76), add:

```typescript
  const newSubscriptions = payments
    .filter(p => p.payment_type === 'new_subscription')
    .reduce((sum, p) => sum + (p.amount ?? 0), 0)

  const renewals = payments
    .filter(p => p.payment_type === 'renewal')
    .reduce((sum, p) => sum + (p.amount ?? 0), 0)
```

- [ ] **Step 2: Add second row of metric cards**

Find the metrics grid (around line 91) and add a second grid below it:

```typescript
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Efectivo" value={fmt(shift.cash_amount ?? 0)} />
        <MetricCard title="Tarjeta" value={fmt(shift.card_amount ?? 0)} />
        <MetricCard title="Otros" value={fmt(shift.other_amount ?? 0)} />
        <MetricCard title="Total" value={fmt(shift.total_amount ?? 0)} />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <MetricCard title="Inscripciones Nuevas" value={fmt(newSubscriptions)} />
        <MetricCard title="Renovaciones" value={fmt(renewals)} />
      </div>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Test in browser**

Navigate to `/shifts/[id]`

Expected:
- First row: 4 cards (Efectivo, Tarjeta, Otros, Total)
- Second row: 2 cards (Inscripciones Nuevas, Renovaciones)
- Both rows responsive

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/shifts/[id]/page.tsx
git commit -m "feat(shifts): add payment type metrics to shift detail

Add two metric cards showing new subscriptions and renewals totals
below existing payment method cards.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Integration Testing

**Files:**
- Test: Manual browser testing

- [ ] **Step 1: Test new subscription flow**

1. Open app in browser
2. Navigate to client registration wizard
3. Register a brand new client with payment
4. Go to `/reports/monthly-payments`
5. Verify payment shows green "Nueva" badge
6. Verify "Inscripciones Nuevas" card shows correct amount

Expected: All checks pass

- [ ] **Step 2: Test renewal flow**

1. Find existing client in system
2. Create new subscription/payment for that client
3. Go to `/reports/monthly-payments`
4. Verify payment shows blue "Renovación" badge
5. Verify "Renovaciones" card shows correct amount

Expected: All checks pass

- [ ] **Step 3: Test retention rate calculation**

1. Ensure you have at least 1 new subscription and 1 renewal in current month
2. Go to `/reports/monthly-payments`
3. Verify retention rate text appears
4. Manually calculate: (renewals / (new + renewals)) * 100
5. Verify displayed percentage matches

Expected: Calculation is correct

- [ ] **Step 4: Test shift detail page**

1. Open a shift that has payments
2. Navigate to `/shifts/[id]`
3. Verify "Tipo" column shows badges
4. Verify two new metric cards at bottom
5. Verify amounts match table totals

Expected: All displays correct

- [ ] **Step 5: Test CSV export**

1. Go to `/reports/monthly-payments`
2. Click "Exportar CSV"
3. Open downloaded file
4. Verify "Tipo" column exists
5. Verify values are "Nueva", "Renovación", or "Sin clasificar"

Expected: CSV contains correct data

- [ ] **Step 6: Test NULL handling**

1. Check old payments (before this feature) in database
2. Verify they show "—" in UI
3. Verify they're excluded from retention rate calculation
4. Verify they show "Sin clasificar" in CSV

Expected: NULL values handled gracefully

- [ ] **Step 7: Document test results**

Create file: `docs/superpowers/test-results-payment-type.md`

```markdown
# Payment Type Classification - Test Results

Date: 2026-04-21

## Test Cases

### New Subscription Detection
- [x] New client payment → payment_type = 'new_subscription'
- [x] Badge shows green "Nueva"
- [x] Metric card counts correctly

### Renewal Detection
- [x] Existing client payment → payment_type = 'renewal'
- [x] Badge shows blue "Renovación"
- [x] Metric card counts correctly

### Retention Rate
- [x] Formula: (renewals / (new + renewals)) * 100
- [x] Only counts classified payments
- [x] Hidden when no classified payments

### UI Components
- [x] Monthly payments report - badges
- [x] Monthly payments report - metrics
- [x] Monthly payments report - CSV export
- [x] Shift detail - badges
- [x] Shift detail - metrics

### Edge Cases
- [x] NULL payments show "—" in UI
- [x] NULL payments excluded from metrics
- [x] NULL payments show "Sin clasificar" in CSV

## Issues Found
[None / List any issues]

## Conclusion
All tests passing. Feature ready for deployment.
```

- [ ] **Step 8: Commit test documentation**

```bash
git add docs/superpowers/test-results-payment-type.md
git commit -m "docs: add payment type classification test results

Document manual testing results for payment type classification
feature across all UI components and edge cases.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Self-Review Checklist

After completing all tasks, verify:

**Spec Coverage:**
- [x] Database schema - payment_type column added
- [x] TypeScript types - payments types updated
- [x] Detection logic - createPayment() classifies automatically
- [x] Monthly payments report - badges + metrics + CSV
- [x] Shift detail - badges + metrics
- [x] NULL handling - graceful degradation
- [x] Testing - manual integration tests passed

**No Placeholders:**
- [x] All code blocks are complete
- [x] All file paths are exact
- [x] All commands have expected output
- [x] No "TBD", "TODO", or "implement later"

**Type Consistency:**
- [x] payment_type values consistent: 'new_subscription' | 'renewal' | null
- [x] Badge styling matches across pages
- [x] Metric calculations use same logic

**Edge Cases Handled:**
- [x] NULL payment_type displays correctly
- [x] Retention rate handles zero classified payments
- [x] CSV export includes all scenarios
- [x] Payment without subscription_id → payment_type = null

---

## Deployment Notes

**Pre-deployment:**
1. Run TypeScript checks: `npx tsc --noEmit`
2. Run build: `npm run build`
3. Verify no console errors in dev environment
4. Test all flows in staging environment

**Deployment order:**
1. Run database migration first (ALTER TABLE)
2. Deploy backend (types + createPayment logic)
3. Deploy frontend (UI changes)
4. Monitor error logs for 24 hours

**Rollback plan:**
If issues arise:
1. Frontend rollback: revert UI commits (Tasks 4-8)
2. Backend rollback: revert createPayment logic (Task 3)
3. Database rollback: `ALTER TABLE payments DROP COLUMN payment_type;`

**Post-deployment monitoring:**
- Check Supabase logs for query errors
- Verify new payments have payment_type populated
- Monitor retention rate metrics for accuracy
- Check CSV exports download correctly
