'use server'

import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/supabase'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { computeShiftTotals } from '@/lib/shifts'
import { escapeForLike, normalizePagination, type PaginatedResult, type PaginationParams } from '@/lib/supabase/actions/pagination'

export interface ShiftResponsible {
  id: string
  name: string | null
  last_name: string | null
  displayName: string | null
  email: string | null
}

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    return null
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function readMetadataString(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

async function getResponsible(userId: string | null): Promise<ShiftResponsible | null> {
  if (!userId) return null

  const adminClient = createAdminClient()
  if (!adminClient) {
    return { id: userId, name: null, last_name: null, displayName: null, email: null }
  }

  const { data, error } = await adminClient.auth.admin.getUserById(userId)
  if (error) {
    return { id: userId, name: null, last_name: null, displayName: null, email: null }
  }

  const metadata = data.user.user_metadata ?? {}
  const name = readMetadataString(metadata, ['name', 'first_name', 'firstName', 'given_name'])
  const lastName = readMetadataString(metadata, ['last_name', 'lastName', 'family_name'])
  const fullName = readMetadataString(metadata, ['full_name', 'fullName', 'display_name'])
  const displayName = fullName ?? ([name, lastName].filter(Boolean).join(' ') || null)

  return {
    id: userId,
    name,
    last_name: lastName,
    displayName,
    email: data.user.email ?? null,
  }
}

export async function getActiveShift(locationId: number) {
  const supabase = await createClient()
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

export async function getActiveShiftSummary(locationId: number) {
  const activeShift = await getActiveShift(locationId)
  if (!activeShift) return null

  const supabase = await createClient()
  const { data: payments, error } = await supabase
    .from('payments')
    .select('amount, payment_method, payment_type')
    .eq('shift_id', activeShift.id)

  if (error) throw new Error(error.message)

  const totals = computeShiftTotals(
    (payments ?? []).map(payment => ({
      amount: payment.amount ?? 0,
      payment_method: payment.payment_method ?? '',
    }))
  )

  const newSubscriptions = (payments ?? []).filter(payment => payment.payment_type === 'new_subscription')
  const renewals = (payments ?? []).filter(payment => payment.payment_type === 'renewal')
  const sumPayments = (rows: typeof newSubscriptions) =>
    rows.reduce((sum, payment) => sum + (payment.amount ?? 0), 0)

  return {
    shift: activeShift,
    responsible: await getResponsible(activeShift.opened_by),
    totals,
    paymentCount: payments?.length ?? 0,
    newSubscriptionCount: newSubscriptions.length,
    newSubscriptionIncome: sumPayments(newSubscriptions),
    renewalCount: renewals.length,
    renewalIncome: sumPayments(renewals),
  }
}

export async function openShift(locationId: number): Promise<{ data: unknown; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autenticado' }

  const existing = await getActiveShift(locationId)
  if (existing) return { data: null, error: 'Ya existe un turno activo' }

  const { data, error } = await supabase
    .from('shifts')
    .insert({ location_id: locationId, opened_by: user.id })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath('/shifts')
  return { data, error: null }
}

export async function closeShift(shiftId: number, notes?: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: payments } = await supabase
    .from('payments')
    .select('amount, payment_method')
    .eq('shift_id', shiftId)

  const totals = computeShiftTotals(
    (payments ?? []).map(p => ({ amount: p.amount ?? 0, payment_method: p.payment_method ?? '' }))
  )

  const normalizedNotes = notes?.trim() || null

  const { error } = await supabase
    .from('shifts')
    .update({ closed_at: new Date().toISOString(), notes: normalizedNotes, ...totals })
    .eq('id', shiftId)
    .eq('opened_by', user.id)
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/shifts')
  revalidatePath(`/shifts/${shiftId}`)
  return { error: null }
}

export async function getShifts(locationId: number, userId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('shifts')
    .select('*')
    .eq('location_id', locationId)
    .order('opened_at', { ascending: false })

  if (userId) query = query.eq('opened_by', userId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getShiftsPage(
  locationId: number,
  params?: PaginationParams & { userId?: string }
): Promise<PaginatedResult<Awaited<ReturnType<typeof getShifts>>[number] & { responsible: ShiftResponsible | null }>> {
  const supabase = await createClient()
  const { page, pageSize, search, from, to } = normalizePagination(params)

  let query = supabase
    .from('shifts')
    .select('*', { count: 'exact' })
    .eq('location_id', locationId)
    .order('opened_at', { ascending: false })

  if (params?.userId) {
    query = query.eq('opened_by', params.userId)
  }

  if (search) {
    const value = escapeForLike(search)
    const numericSearch = Number(search)
    const filters = [`notes.ilike.%${value}%`, `opened_by.ilike.%${value}%`]

    if (Number.isFinite(numericSearch)) {
      filters.push(`id.eq.${numericSearch}`)
    }

    query = query.or(filters.join(','))
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw new Error(error.message)
  const rows = data ?? []
  const responsibleEntries = await Promise.all(
    rows.map(async (shift) => [shift.id, await getResponsible(shift.opened_by)] as const)
  )
  const responsibleByShiftId = new Map(responsibleEntries)

  return {
    data: rows.map((shift) => ({
      ...shift,
      responsible: responsibleByShiftId.get(shift.id) ?? null,
    })),
    count: count ?? 0,
    page,
    pageSize,
  }
}

export async function getShiftDetail(shiftId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [shiftRes, paymentsRes] = await Promise.all([
    supabase.from('shifts').select('*').eq('id', shiftId).single(),
    supabase
      .from('payments')
      .select(`*, subscriptions(*, clients(*))`)
      .eq('shift_id', shiftId)
      .order('payment_date', { ascending: true }),
  ])
  if (shiftRes.error) throw new Error(shiftRes.error.message)
  const isMine = !!user && shiftRes.data.opened_by === user.id
  return {
    shift: shiftRes.data,
    responsible: await getResponsible(shiftRes.data.opened_by),
    payments: paymentsRes.data ?? [],
    isMine,
  }
}
