// lib/supabase/actions/workers.ts
'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { Database } from '@/types/supabase'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { escapeForLike, normalizePagination, type PaginatedResult, type PaginationParams } from '@/lib/supabase/actions/pagination'

export interface WorkerAccess {
  id: number
  role: string
  user_id: string | null
  location_id: number | null
  location: { id: number; name: string } | null
  name: string | null
  last_name: string | null
  displayName: string | null
  email: string | null
}

type WorkerAccessRow = Omit<WorkerAccess, 'name' | 'last_name' | 'displayName' | 'email'>

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

function readMetadataString(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function getUserProfile(user: { email?: string; user_metadata?: Record<string, unknown> }) {
  const metadata = user.user_metadata ?? {}
  const name = readMetadataString(metadata, ['name', 'first_name', 'firstName', 'given_name'])
  const lastName = readMetadataString(metadata, ['last_name', 'lastName', 'family_name'])
  const fullName = readMetadataString(metadata, ['full_name', 'fullName', 'display_name'])
  const displayName = fullName ?? ([name, lastName].filter(Boolean).join(' ') || null)

  return {
    name,
    last_name: lastName,
    displayName,
    email: user.email ?? null,
  }
}

async function appendUserProfiles(rows: WorkerAccessRow[]): Promise<WorkerAccess[]> {
  const adminClient = createAdminClient()

  if (!adminClient) {
    return rows.map((row) => ({ ...row, name: null, last_name: null, displayName: null, email: null }))
  }

  const profileEntries = await Promise.all(
    rows.map(async (row) => {
      if (!row.user_id) {
        return [row.id, { name: null, last_name: null, displayName: null, email: null }] as const
      }

      const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(row.user_id)
      if (userError) {
        return [row.id, { name: null, last_name: null, displayName: null, email: null }] as const
      }

      return [row.id, getUserProfile(userData.user)] as const
    })
  )

  const profileByWorkerId = new Map(profileEntries)
  return rows.map((row) => ({
    ...row,
    ...(profileByWorkerId.get(row.id) ?? { name: null, last_name: null, displayName: null, email: null }),
  }))
}

export async function getWorkers(companyId: number): Promise<WorkerAccess[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('user_access')
    .select('id, role, user_id, location_id, location:locations(id, name)')
    .eq('company_id', companyId)
    .in('role', ['admin', 'worker'])
  if (error) throw new Error(error.message)

  const rows = (data as unknown as WorkerAccessRow[]) ?? []
  return appendUserProfiles(rows)
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

  const rows = (data as unknown as WorkerAccessRow[]) ?? []
  const workers = await appendUserProfiles(rows)

  return {
    data: workers,
    count: count ?? 0,
    page,
    pageSize,
  }
}

export async function inviteWorker(
  email: string,
  companyId: number,
  locationId: number,
  role: 'admin' | 'worker',
  profile?: { name?: string; last_name?: string }
): Promise<{ error: string | null }> {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurada en el servidor.' }
  }

  const name = profile?.name?.trim() || undefined
  const lastName = profile?.last_name?.trim() || undefined
  const fullName = [name, lastName].filter(Boolean).join(' ') || undefined
  const headerStore = await headers()
  const origin = headerStore.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    ...(origin ? { redirectTo: `${origin}/set-password` } : {}),
    data: {
      ...(name ? { name } : {}),
      ...(lastName ? { last_name: lastName } : {}),
      ...(fullName ? { full_name: fullName } : {}),
    },
  })
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
  data: { role?: string; location_id?: number; name?: string; last_name?: string }
): Promise<{ error: string | null }> {
  const supabase = await createServerClient()
  const { name, last_name, ...accessData } = data
  const { data: worker, error: workerError } = await supabase
    .from('user_access')
    .select('user_id')
    .eq('id', id)
    .single()

  if (workerError) return { error: workerError.message }

  const { error } = await supabase.from('user_access').update(accessData).eq('id', id)
  if (error) return { error: error.message }

  if (typeof name !== 'undefined' || typeof last_name !== 'undefined') {
    const adminClient = createAdminClient()
    if (!adminClient) {
      return { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurada en el servidor.' }
    }

    if (!worker.user_id) {
      return { error: 'El trabajador no tiene un usuario asociado.' }
    }

    const currentUser = await adminClient.auth.admin.getUserById(worker.user_id)
    if (currentUser.error) return { error: currentUser.error.message }

    const metadata = currentUser.data.user.user_metadata ?? {}
    const nextName = typeof name === 'undefined' ? readMetadataString(metadata, ['name', 'first_name', 'firstName', 'given_name']) : name.trim()
    const nextLastName = typeof last_name === 'undefined' ? readMetadataString(metadata, ['last_name', 'lastName', 'family_name']) : last_name.trim()
    const fullName = [nextName, nextLastName].filter(Boolean).join(' ')

    const { error: updateUserError } = await adminClient.auth.admin.updateUserById(worker.user_id, {
      user_metadata: {
        ...metadata,
        name: nextName,
        last_name: nextLastName,
        full_name: fullName || null,
      },
    })
    if (updateUserError) return { error: updateUserError.message }
  }

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
