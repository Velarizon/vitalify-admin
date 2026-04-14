'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

  const { data, error } = await supabase
    .from('payments')
    .insert({
      ...payment,
      payment_date: new Date().toISOString(),
      registered_by: user?.id ?? null,
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
    .gte('payment_date', start)
    .lte('payment_date', end)
    .order('payment_date', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}
