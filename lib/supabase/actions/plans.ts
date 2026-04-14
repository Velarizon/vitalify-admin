// lib/supabase/actions/plans.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getPlans(companyId: number) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('plans').select('*').eq('company_id', companyId)
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function upsertPlan(plan: {
  id?: number; name: string; price: number; duration: string;
  description?: string; access_level: string; access_start_time?: string | null;
  access_end_time?: string | null; company_id: number
}) {
  const supabase = await createClient()
  const { id, ...data } = plan
  const { error } = id
    ? await supabase.from('plans').update(data as any).eq('id', id)
    : await supabase.from('plans').insert(data as any)
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
  const { error } = await supabase
    .from('plans')
    .update({ is_active: isActive })
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
