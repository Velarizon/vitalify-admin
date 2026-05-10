import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const runtime = 'edge'

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function readMetadataString(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const val = metadata[key]
    if (typeof val === 'string' && val.trim()) return val.trim()
  }
  return null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json({ id, name: null, last_name: null, displayName: null, email: null })
  }

  const { data, error } = await adminClient.auth.admin.getUserById(id)
  if (error) {
    return NextResponse.json({ id, name: null, last_name: null, displayName: null, email: null })
  }

  const metadata = data.user.user_metadata ?? {}
  const name = readMetadataString(metadata, ['name', 'first_name', 'firstName', 'given_name'])
  const lastName = readMetadataString(metadata, ['last_name', 'lastName', 'family_name'])
  const fullName = readMetadataString(metadata, ['full_name', 'fullName', 'display_name'])
  const displayName = fullName ?? ([name, lastName].filter(Boolean).join(' ') || null)

  return NextResponse.json({ id, name, last_name: lastName, displayName, email: data.user.email ?? null })
}
