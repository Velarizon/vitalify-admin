// lib/supabase/actions/clients.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { escapeForLike, normalizePagination, type PaginatedResult, type PaginationParams } from '@/lib/supabase/actions/pagination'

export async function getClients(companyId: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select(`*, subscriptions(id, end_date, plans(name))`)
    .eq('company_id', companyId)
    .order('id', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getClientsPage(
  companyId: number,
  params?: PaginationParams
): Promise<PaginatedResult<Awaited<ReturnType<typeof getClients>>[number]>> {
  const supabase = await createClient()
  const { page, pageSize, search, from, to } = normalizePagination(params)

  let query = supabase
    .from('clients')
    .select('*, subscriptions(id, end_date, plans(name))', { count: 'exact' })
    .eq('company_id', companyId)
    .order('id', { ascending: false })

  if (search) {
    const value = escapeForLike(search)
    query = query.or(
      `name.ilike.%${value}%,last_name.ilike.%${value}%,email.ilike.%${value}%,phone_number.ilike.%${value}%`
    )
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

export async function updateClient(clientId: number, updates: {
  name?: string; last_name?: string; email?: string;
  phone_number?: string; date_of_birth?: string; gender?: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('clients').update(updates).eq('id', clientId)
  if (error) throw new Error(error.message)
  revalidatePath('/clients')
}
