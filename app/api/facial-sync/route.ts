import { NextResponse } from 'next/server'
import type { RegisterUserPayload, UpdateUserPatch, FacialSyncResponse } from '@/lib/facial-api'
import { createAdminClient } from '@/lib/supabase/admin'
import { saveEmbeddings } from '@/lib/facial-sync'

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
  const apiUrl = process.env.FACIAL_API_URL
  const syncKey = process.env.FACIAL_SYNC_KEY

  if (!apiUrl || !syncKey) {
    return NextResponse.json({ error: 'Facial API not configured' }, { status: 503 })
  }

  const body: RegisterUserPayload = await request.json()

  let res: Response
  try {
    res = await fetch(`${apiUrl}/api/sync/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'vitalify-sync-key': syncKey,
      },
      body: JSON.stringify(body),
    })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Facial API no disponible. Verifica que el servicio esté en línea.', status: 503, data: null, error_type: 'CONNECTION_ERROR' },
      { status: 503 }
    )
  }

  if (!res.ok) {
    const json = await res.json().catch(() => ({ success: false, message: 'Error desconocido', status: res.status, data: null, error_type: null }))
    return NextResponse.json(json, { status: res.status })
  }

  const data = await res.json()
  await backupEmbedding(data)
  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const apiUrl = process.env.FACIAL_API_URL
  const syncKey = process.env.FACIAL_SYNC_KEY

  if (!apiUrl || !syncKey) {
    return NextResponse.json({ error: 'Facial API not configured' }, { status: 503 })
  }

  const body: { supabase_user_id: number } & UpdateUserPatch = await request.json()

  let res: Response
  try {
    res = await fetch(`${apiUrl}/api/sync/user`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'vitalify-sync-key': syncKey,
      },
      body: JSON.stringify(body),
    })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Facial API no disponible. Verifica que el servicio esté en línea.', status: 503, data: null, error_type: 'CONNECTION_ERROR' },
      { status: 503 }
    )
  }

  if (!res.ok) {
    const json = await res.json().catch(() => ({ success: false, message: 'Error desconocido', status: res.status, data: null, error_type: null }))
    return NextResponse.json(json, { status: res.status })
  }

  const data = await res.json()
  await backupEmbedding(data)
  return NextResponse.json(data)
}
