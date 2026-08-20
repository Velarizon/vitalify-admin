// lib/vitalify-billing.ts
// Billing for the Vitalify app add-on ($99 MXN / 30-day cycle).
//
// A client can activate the app mid-cycle, independently of their gym
// membership. That first $99 pays for a fixed 30-day window
// (`vitalify_app_paid_until`). The next time the client's gym membership is
// renewed, the app's paid-through date needs to catch up to the gym's new
// end date — that's the "sync" charge, prorated for the gap in days. Once
// caught up (`vitalify_billing_synced_at` set), every future renewal just
// charges the flat $99, no matter how long the gym plan is.
export const MOBILE_APP_ADDON_PRICE = 99
const APP_CYCLE_DAYS = 30
const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Charge to bring the app's paid-through date (`appPaidUntil`) up to
 * `targetEndDate` (the gym's current or post-renewal end date).
 * - No baseline yet (never activated, or pre-dates this field) -> full price.
 * - App already paid through `targetEndDate` or beyond -> nothing owed.
 * - Gap bigger than a full cycle (lapsed more than ~a month) -> full price,
 *   a proportional charge across that big a gap isn't worth prorating.
 * - Otherwise -> prorated for the exact day gap.
 */
// Calendar date (UTC Y/M/D, time-of-day dropped) as a millisecond timestamp.
// `appPaidUntil` and `targetEndDate` come from different sources that don't
// share a time-of-day convention (a `date` column parsed at local midnight vs
// a `timestamptz` typed as UTC midnight) — comparing raw milliseconds lets
// that mismatch leak in as a spurious extra day. Only the calendar date is
// ever meaningful for this billing logic, so drop the time entirely.
function utcDateOnly(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

export function calculateAppSyncCharge(
  appPaidUntil: string | Date | null,
  targetEndDate: string | Date,
): number {
  if (!appPaidUntil) return MOBILE_APP_ADDON_PRICE
  const gapDays = Math.round((utcDateOnly(new Date(targetEndDate)) - utcDateOnly(new Date(appPaidUntil))) / MS_PER_DAY)
  if (gapDays <= 0) return 0
  if (gapDays > APP_CYCLE_DAYS) return MOBILE_APP_ADDON_PRICE
  return Math.round((MOBILE_APP_ADDON_PRICE / APP_CYCLE_DAYS) * gapDays)
}

/** Paid-through date for a fresh app activation today: today + one 30-day cycle. */
export function calculateInitialAppPaidUntil(today: Date = new Date()): Date {
  return new Date(today.getTime() + APP_CYCLE_DAYS * MS_PER_DAY)
}
