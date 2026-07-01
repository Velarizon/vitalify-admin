import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hydrateSyncPayloads } from '@/lib/facial-sync'

export async function POST(request: Request) {
  const apiUrl = process.env.FACIAL_API_URL
  const syncKey = process.env.FACIAL_SYNC_KEY

  if (!apiUrl || !syncKey) {
    return NextResponse.json({ error: 'Facial API not configured' }, { status: 503 })
  }

  const { clientId } = await request.json() as { clientId: number }
  if (!Number.isFinite(clientId)) {
    return NextResponse.json({ error: 'clientId inválido' }, { status: 400 })
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY no está configurada.' }, { status: 500 })
  }

  const [payload] = await hydrateSyncPayloads(adminClient, [clientId])
  if (!payload) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  let res: Response
  try {
    res = await fetch(`${apiUrl}/api/sync/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'vitalify-sync-key': syncKey },
      body: JSON.stringify(payload),
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

  return NextResponse.json(await res.json())
}
