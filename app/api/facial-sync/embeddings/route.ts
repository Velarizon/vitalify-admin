import { NextResponse } from 'next/server'
import { saveEmbeddings } from '@/lib/facial-sync'
import type { EmbeddingsResponse } from '@/lib/facial-api'
import { callFacialApi, requireAuthedAdmin } from '@/lib/facial-api-server'

export const runtime = 'edge'

/**
 * Respalda en Supabase (tabla face_embedding) los embeddings de los clientes indicados.
 * Trae los vectores de RecFacialApi (POST /api/sync/users/embeddings) y los guarda con el
 * mismo helper que el alta individual. Los embeddings nunca salen hacia el navegador.
 */
export async function POST(request: Request) {
  const { clientIds } = await request.json() as { clientIds: number[] }
  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    return NextResponse.json({ error: 'clientIds vacío o inválido' }, { status: 400 })
  }

  const gate = await requireAuthedAdmin()
  if (!gate.ok) return gate.response
  const adminClient = gate.data

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
  const call = await callFacialApi<EmbeddingsResponse>('/api/sync/users/embeddings', {
    method: 'POST',
    body: { supabase_user_ids: idsToFetch },
  })
  if (!call.ok) return call.response

  const embeddings = call.data?.data?.embeddings ?? []
  const missing = call.data?.data?.missing ?? []

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
