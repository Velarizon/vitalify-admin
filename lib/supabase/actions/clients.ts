// lib/supabase/actions/clients.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getClients(companyId: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select(`*, subscriptions(id, end_date, is_sync, plans(name))`)
    .eq('company_id', companyId)
    .order('id', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createClientRecord(client: {
  name: string; last_name: string; email: string; phone_number: string;
  date_of_birth: string; gender: string; image_url?: string; company_id: number
}) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('clients').insert(client).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/clients')
  return data
}

export async function createSubscription(sub: {
  client_id: number; plan_id: number; location_id: number;
  start_date: string; end_date: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('subscriptions').insert(sub).select().single()
  if (error) throw new Error(error.message)
  return data
}
