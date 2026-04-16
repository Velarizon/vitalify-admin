// lib/supabase/actions/workers.ts
'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { Database } from '@/types/supabase'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { escapeForLike, normalizePagination, type PaginatedResult, type PaginationParams } from '@/lib/supabase/actions/pagination'

export interface WorkerAccess {
  id: number
  role: string
  user_id: string | null
  location_id: number | null
  location: { id: number; name: string } | null
  email: string | null
}

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    return null
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function getWorkers(companyId: number): Promise<WorkerAccess[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('user_access')
    .select('id, role, user_id, location_id, location:locations(id, name)')
    .eq('company_id', companyId)
    .in('role', ['admin', 'worker'])
  if (error) throw new Error(error.message)

  const rows = (data as unknown as Omit<WorkerAccess, 'email'>[]) ?? []
  const adminClient = createAdminClient()

  if (!adminClient) {
    return rows.map((row) => ({ ...row, email: null }))
  }

  const emailEntries = await Promise.all(
    rows.map(async (row) => {
      if (!row.user_id) return [row.id, null] as const
      const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(row.user_id)
      if (userError) return [row.id, null] as const
      return [row.id, userData.user.email ?? null] as const
    })
  )

  const emailByWorkerId = new Map(emailEntries)
  return rows.map((row) => ({ ...row, email: emailByWorkerId.get(row.id) ?? null }))
}

export async function getWorkersPage(
  companyId: number,
  params?: PaginationParams
): Promise<PaginatedResult<WorkerAccess>> {
  const supabase = await createServerClient()
  const { page, pageSize, search, from, to } = normalizePagination(params)

  let query = supabase
    .from('user_access')
    .select('id, role, user_id, location_id, location:locations(id, name)', { count: 'exact' })
    .eq('company_id', companyId)
    .in('role', ['admin', 'worker'])
    .order('id', { ascending: false })

  if (search) {
    const value = escapeForLike(search)
    query = query.or(`role.ilike.%${value}%,user_id.ilike.%${value}%`)
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw new Error(error.message)

  const rows = (data as unknown as Omit<WorkerAccess, 'email'>[]) ?? []
  const adminClient = createAdminClient()

  if (!adminClient) {
    return {
      data: rows.map((row) => ({ ...row, email: null })),
      count: count ?? 0,
      page,
      pageSize,
    }
  }

  const emailEntries = await Promise.all(
    rows.map(async (row) => {
      if (!row.user_id) return [row.id, null] as const
      const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(row.user_id)
      if (userError) return [row.id, null] as const
      return [row.id, userData.user.email ?? null] as const
    })
  )

  const emailByWorkerId = new Map(emailEntries)

  return {
    data: rows.map((row) => ({ ...row, email: emailByWorkerId.get(row.id) ?? null })),
    count: count ?? 0,
    page,
    pageSize,
  }
}

export async function inviteWorker(
  email: string,
  companyId: number,
  locationId: number,
  role: 'admin' | 'worker'
): Promise<{ error: string | null }> {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurada en el servidor.' }
  }

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email)
  if (inviteError) return { error: inviteError.message }

  const { error: accessError } = await adminClient.from('user_access').insert({
    user_id: invited.user.id,
    company_id: companyId,
    location_id: locationId,
    role,
  })
  if (accessError) return { error: accessError.message }

  revalidatePath('/workers')
  return { error: null }
}

export async function updateWorker(
  id: number,
  data: { role?: string; location_id?: number }
): Promise<{ error: string | null }> {
  const supabase = await createServerClient()
  const { error } = await supabase.from('user_access').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/workers')
  return { error: null }
}

export async function deactivateWorker(id: number): Promise<{ error: string | null }> {
  const supabase = await createServerClient()
  const { error } = await supabase.from('user_access').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/workers')
  return { error: null }
}
