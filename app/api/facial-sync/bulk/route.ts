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

  const { clientIds } = await request.json() as { clientIds: number[] }
  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    return NextResponse.json({ error: 'clientIds vacío o inválido' }, { status: 400 })
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

  const users = await hydrateSyncPayloads(adminClient, clientIds)
  if (users.length === 0) {
    return NextResponse.json({ error: 'No se encontraron clientes para registrar' }, { status: 404 })
  }

  // Dispara el job en background (RecFacialApi responde 202 al instante)
  let res: Response
  try {
    res = await fetch(`${apiUrl}/api/sync/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'vitalify-sync-key': syncKey },
      body: JSON.stringify({ users }),
    })
  } catch {
    return NextResponse.json(
      { success: false, message: 'RecFacialApi no disponible. Verifica que el servicio esté en línea.', status: 503, data: null, error_type: 'CONNECTION_ERROR' },
      { status: 503 }
    )
  }

  if (!res.ok) {
    const json = await res.json().catch(() => ({ success: false, message: 'Error desconocido', status: res.status, data: null, error_type: null }))
    return NextResponse.json(json, { status: res.status })
  }

  return NextResponse.json(await res.json())
}
