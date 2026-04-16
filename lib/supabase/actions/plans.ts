// lib/supabase/actions/plans.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { escapeForLike, normalizePagination, type PaginatedResult, type PaginationParams } from '@/lib/supabase/actions/pagination'
import type { Database } from '@/types/supabase'

export async function getPlans(companyId: number) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('plans').select('*').eq('company_id', companyId).order('id', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getPlansPage(
  companyId: number,
  params?: PaginationParams
): Promise<PaginatedResult<Awaited<ReturnType<typeof getPlans>>[number]>> {
  const supabase = await createClient()
  const { page, pageSize, search, from, to } = normalizePagination(params)

  let query = supabase
    .from('plans')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .order('id', { ascending: false })

  if (search) {
    const value = escapeForLike(search)
    query = query.or(`name.ilike.%${value}%,duration.ilike.%${value}%,access_level.ilike.%${value}%`)
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

export async function upsertPlan(plan: {
  id?: number; name: string; price: number; duration: string;
  description?: string; access_level: string; access_start_time?: string | null;
  access_end_time?: string | null; company_id: number
}) {
  const supabase = await createClient()
  const { id, ...data } = plan
  const payload: Database['public']['Tables']['plans']['Insert'] = data
  const { error } = id
    ? await supabase.from('plans').update(payload).eq('id', id)
    : await supabase.from('plans').insert(payload)
  if (error) throw new Error(error.message)
  revalidatePath('/plans')
}

export async function deletePlan(id: number) {
  const supabase = await createClient()
  const { error } = await supabase.from('plans').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/plans')
}

export async function togglePlanActive(planId: number, isActive: boolean) {
  const supabase = await createClient()
  const payload: Database['public']['Tables']['plans']['Update'] = { is_active: isActive }
  const { error } = await supabase
    .from('plans')
    .update(payload)
    .eq('id', planId)
  if (error) throw new Error(error.message)
  revalidatePath('/plans')
}

export async function getActivePlans(companyId: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
  if (error) throw new Error(error.message)
  return data ?? []
}
