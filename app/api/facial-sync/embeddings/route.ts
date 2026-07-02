import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { saveEmbeddings } from '@/lib/facial-sync'
import type { EmbeddingsResponse } from '@/lib/facial-api'

/**
 * Respalda en Supabase (tabla face_embedding) los embeddings de los clientes indicados.
 * Trae los vectores de RecFacialApi (POST /api/sync/users/embeddings) y los guarda con el
 * mismo helper que el alta individual. Los embeddings nunca salen hacia el navegador.
 */
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

  // 1. Saltar los clientes que YA tienen un embedding activo respaldado: son los que se
  //    restauraron, así que el vector en RecFacialApi es idéntico al de Supabase (salió de aquí).
  //    Re-guardarlos solo generaría historial redundante. Solo respaldamos los que no tienen.
  const { data: existing, error: existingError } = await adminClient
    .from('face_embedding')
    .select('client_id')
    .in('client_id', clientIds)
    .eq('active', true)
  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }
  const alreadyBackedUp = new Set((existing ?? []).map((r) => r.client_id))
  const idsToFetch = clientIds.filter((id) => !alreadyBackedUp.has(id))
  const skipped = clientIds.length - idsToFetch.length

  if (idsToFetch.length === 0) {
    return NextResponse.json({ saved: 0, missing: [], skipped })
  }

  // 2. Traer desde RecFacialApi solo los embeddings que faltan por respaldar
  let res: Response
  try {
    res = await fetch(`${apiUrl}/api/sync/users/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'vitalify-sync-key': syncKey },
      body: JSON.stringify({ supabase_user_ids: idsToFetch }),
    })
  } catch {
    return NextResponse.json(
      { error: 'Facial API no disponible. Verifica que el servicio esté en línea.', error_type: 'CONNECTION_ERROR' },
      { status: 503 }
    )
  }

  if (!res.ok) {
    const json = await res.json().catch(() => null)
    return NextResponse.json({ error: json?.message ?? 'Error al consultar embeddings en Facial API' }, { status: res.status })
  }

  const json = await res.json() as EmbeddingsResponse
  const embeddings = json?.data?.embeddings ?? []
  const missing = json?.data?.missing ?? []

  // 3. Guardar en Supabase (mismo helper que el alta individual)
  try {
    await saveEmbeddings(adminClient, embeddings.map((e) => ({
      client_id:  e.supabase_user_id,
      embedding:  e.embedding,
      model_name: e.model_name,
    })))
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  return NextResponse.json({ saved: embeddings.length, missing, skipped })
}
