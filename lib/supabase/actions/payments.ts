'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { escapeForLike, normalizePagination, type PaginatedResult, type PaginationParams } from '@/lib/supabase/actions/pagination'

export async function getPayments(locationId: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select(`*, subscriptions(*, clients(*))`)
    .eq('location_id', locationId)
    .order('id', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getPaymentsPage(
  locationId: number,
  params?: PaginationParams
): Promise<PaginatedResult<Awaited<ReturnType<typeof getPayments>>[number]>> {
  const supabase = await createClient()
  const { page, pageSize, search, from, to } = normalizePagination(params)

  let query = supabase
    .from('payments')
    .select('*, subscriptions(*, clients(*))', { count: 'exact' })
    .eq('location_id', locationId)
    .order('id', { ascending: false })

  if (search) {
    const value = escapeForLike(search)
    const numericSearch = Number(search)
    const filters = [`payment_method.ilike.%${value}%`]

    if (Number.isFinite(numericSearch)) {
      filters.push(`id.eq.${numericSearch}`, `shift_id.eq.${numericSearch}`, `subscription_id.eq.${numericSearch}`)
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

export async function createPayment(payment: {
  subscription_id: number
  amount: number
  payment_method: string
  location_id: number
  shift_id?: number | null
  registered_by?: string | null
  payment_type?: 'new_subscription' | 'renewal' | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Determine payment_type based on client subscription history
  let paymentType: 'new_subscription' | 'renewal' | null = payment.payment_type ?? null

  if (!paymentType && payment.subscription_id) {
    // Get the client_id from the subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('client_id')
      .eq('id', payment.subscription_id)
      .single()

    if (subError) throw new Error(subError.message)

    if (subscription?.client_id) {
      // Count OTHER subscriptions for this client (excluding current one)
      const { count, error: countError } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', subscription.client_id)
        .neq('id', payment.subscription_id)

      if (countError) throw new Error(countError.message)

      // If count > 0, this is a renewal. Otherwise, it's a new subscription
      paymentType = (count ?? 0) > 0 ? 'renewal' : 'new_subscription'
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

export async function getPaymentsByMonth(locationId: number, year: number, month: number) {
  const supabase = await createClient()
  const start = new Date(year, month - 1, 1).toISOString()
  const end = new Date(year, month, 0, 23, 59, 59, 999).toISOString()

  const { data, error } = await supabase
    .from('payments')
    .select(`*, subscriptions(*, clients(*), plans(*))`)
    .eq('location_id', locationId)
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return data ?? []
}
