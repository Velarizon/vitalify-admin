import { createClient } from '@/lib/supabase/client'
import { computeShiftTotals } from '@/lib/shifts'

export async function getBrowserActiveShift(locationId: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('shifts')
    .select('id, opened_at, location_id, opened_by')
    .eq('opened_by', user.id)
    .eq('location_id', locationId)
    .is('closed_at', null)
    .maybeSingle()

  return data
}

export async function getBrowserActiveShiftSummary(locationId: number) {
  const supabase = createClient()
  const activeShift = await getBrowserActiveShift(locationId)
  if (!activeShift) return null

  const { data: payments, error } = await supabase
    .from('payments')
    .select('amount, payment_method, payment_type')
    .eq('shift_id', activeShift.id)

  if (error) throw new Error(error.message)

  const { data: { user } } = await supabase.auth.getUser()
  const metadata = user?.user_metadata ?? {}
  const displayName = typeof metadata.full_name === 'string'
    ? metadata.full_name
    : [metadata.name, metadata.last_name].filter(value => typeof value === 'string' && value.trim()).join(' ') || null

  const totals = computeShiftTotals(
    (payments ?? []).map(payment => ({
      amount: payment.amount ?? 0,
      payment_method: payment.payment_method ?? '',
    }))
  )
  const newSubscriptions = (payments ?? []).filter(payment => payment.payment_type === 'new_subscription')
  const renewals = (payments ?? []).filter(payment => payment.payment_type === 'renewal')
  const visits = (payments ?? []).filter(payment => payment.payment_type === 'visit')
  const sumPayments = (rows: typeof newSubscriptions) =>
    rows.reduce((sum, payment) => sum + (payment.amount ?? 0), 0)

  return {
    shift: activeShift,
    responsible: {
      id: activeShift.opened_by,
      name: typeof metadata.name === 'string' ? metadata.name : null,
      last_name: typeof metadata.last_name === 'string' ? metadata.last_name : null,
      displayName,
      email: user?.email ?? null,
    },
    totals,
    paymentCount: payments?.length ?? 0,
    newSubscriptionCount: newSubscriptions.length,
    newSubscriptionIncome: sumPayments(newSubscriptions),
    renewalCount: renewals.length,
    renewalIncome: sumPayments(renewals),
    visitCount: visits.length,
    visitIncome: sumPayments(visits),
  }
}

export async function openBrowserShift(locationId: number): Promise<{ data: unknown; error: string | null }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autenticado' }

  const existing = await getBrowserActiveShift(locationId)
  if (existing) return { data: null, error: 'Ya existe un turno activo' }

  const { data, error } = await supabase
    .from('shifts')
    .insert({ location_id: locationId, opened_by: user.id })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}
