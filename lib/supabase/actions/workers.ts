// lib/supabase/actions/workers.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface WorkerAccess {
  id: number
  role: string
  user_id: string | null
  location: { id: number; name: string } | null
}

export async function getWorkers(companyId: number): Promise<WorkerAccess[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_access')
    .select('id, role, user_id, location:locations(id, name)')
    .eq('company_id', companyId)
    .in('role', ['admin', 'worker'])
  if (error) throw new Error(error.message)
  return (data as unknown as WorkerAccess[]) ?? []
}

export async function inviteWorker(email: string, companyId: number, locationId: number, role: 'admin' | 'worker'): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email)
  if (inviteError) return { error: inviteError.message }

  const { error: accessError } = await supabase.from('user_access').insert({
    user_id: invited.user.id,
    company_id: companyId,
    location_id: locationId,
    role,
  })
  if (accessError) return { error: accessError.message }

  revalidatePath('/workers')
  return { error: null }
}
