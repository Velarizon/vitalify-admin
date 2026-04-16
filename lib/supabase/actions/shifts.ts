'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { computeShiftTotals } from '@/lib/shifts'
import { escapeForLike, normalizePagination, type PaginatedResult, type PaginationParams } from '@/lib/supabase/actions/pagination'

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

  const { error } = await supabase
    .from('shifts')
    .update({ closed_at: new Date().toISOString(), notes: notes ?? null, ...totals })
    .eq('id', shiftId)
    .eq('opened_by', user.id)

  if (error) return { error: error.message }
  revalidatePath('/shifts')
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
): Promise<PaginatedResult<Awaited<ReturnType<typeof getShifts>>[number]>> {
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

  return {
    data: data ?? [],
    count: count ?? 0,
    page,
    pageSize,
  }
}

export async function getShiftDetail(shiftId: number) {
  const supabase = await createClient()
  const [shiftRes, paymentsRes] = await Promise.all([
    supabase.from('shifts').select('*').eq('id', shiftId).single(),
    supabase
      .from('payments')
      .select(`*, subscriptions(*, clients(*))`)
      .eq('shift_id', shiftId)
      .order('payment_date', { ascending: true }),
  ])
  if (shiftRes.error) throw new Error(shiftRes.error.message)
  return { shift: shiftRes.data, payments: paymentsRes.data ?? [] }
}
