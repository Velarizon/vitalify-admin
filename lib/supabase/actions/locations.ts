// lib/supabase/actions/locations.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getLocations(companyId: number) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('locations').select('*').eq('company_id', companyId)
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function upsertLocation(location: {
  id?: number; name: string; address?: string; city?: string; zip_code?: string; company_id: number
}) {
  const supabase = await createClient()
  const { id, ...data } = location
  const { error } = id
    ? await supabase.from('locations').update(data as any).eq('id', id)
    : await supabase.from('locations').insert(data as any)
  if (error) throw new Error(error.message)
  revalidatePath('/locations')
}
