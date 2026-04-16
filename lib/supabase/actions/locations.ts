// lib/supabase/actions/locations.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { escapeForLike, normalizePagination, type PaginatedResult, type PaginationParams } from '@/lib/supabase/actions/pagination'
import type { Database } from '@/types/supabase'

export async function getLocations(companyId: number) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('locations').select('*').eq('company_id', companyId).order('id', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getLocationsPage(
  companyId: number,
  params?: PaginationParams
): Promise<PaginatedResult<Awaited<ReturnType<typeof getLocations>>[number]>> {
  const supabase = await createClient()
  const { page, pageSize, search, from, to } = normalizePagination(params)

  let query = supabase
    .from('locations')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .order('id', { ascending: false })

  if (search) {
    const value = escapeForLike(search)
    query = query.or(`name.ilike.%${value}%,address.ilike.%${value}%,city.ilike.%${value}%,zip_code.ilike.%${value}%`)
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

export async function upsertLocation(location: {
  id?: number; name: string; address?: string; city?: string; zip_code?: string; company_id: number
}) {
  const supabase = await createClient()
  const { id, ...data } = location
  const payload: Database['public']['Tables']['locations']['Insert'] = data
  const { error } = id
    ? await supabase.from('locations').update(payload).eq('id', id)
    : await supabase.from('locations').insert(payload)
  if (error) throw new Error(error.message)
  revalidatePath('/locations')
}
