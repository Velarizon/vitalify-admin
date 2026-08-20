import { NextResponse } from 'next/server'
import type { RegisterUserPayload, UpdateUserPatch, FacialSyncResponse } from '@/lib/facial-api'
import { createAdminClient } from '@/lib/supabase/admin'
import { saveEmbeddings } from '@/lib/facial-sync'
import { callFacialApi } from '@/lib/facial-api-server'

export const runtime = 'edge'

async function backupEmbedding(data: FacialSyncResponse) {
  const d = data?.data
  if (!d?.success || !d.embedding || !d.model_name) return
  try {
    const admin = createAdminClient()
    if (!admin) return
    await saveEmbeddings(admin, [{
      client_id:  d.supabase_user_id,
      embedding:  d.embedding,
      model_name: d.model_name,
    }])
  } catch (e) {
    console.error('face_embedding backup failed:', e)
  }
}

export async function POST(request: Request) {
  const body: RegisterUserPayload = await request.json()
  const call = await callFacialApi<FacialSyncResponse>('/api/sync/user', { method: 'POST', body })
  if (!call.ok) return call.response
  await backupEmbedding(call.data)
  return NextResponse.json(call.data)
}

export async function PATCH(request: Request) {
  const body: { supabase_user_id: number } & UpdateUserPatch = await request.json()
  const call = await callFacialApi<FacialSyncResponse>('/api/sync/user', { method: 'PATCH', body })
  if (!call.ok) return call.response
  await backupEmbedding(call.data)
  return NextResponse.json(call.data)
}
