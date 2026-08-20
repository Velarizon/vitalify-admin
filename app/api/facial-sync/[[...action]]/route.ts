import { NextResponse } from 'next/server'
import type {
  RegisterUserPayload, UpdateUserPatch, FacialSyncResponse,
  MembershipUpdatePayload, EmbeddingsResponse,
} from '@/lib/facial-api'
import { createAdminClient } from '@/lib/supabase/admin'
import { hydrateSyncPayloads, saveEmbeddings, facialSyncAction } from '@/lib/facial-sync'
import { callFacialApi, requireAuthedAdmin } from '@/lib/facial-api-server'

export const runtime = 'edge'

// Las 8 rutas de facial-sync viven en este unico route handler porque next-on-pages
// compila una edge function por archivo (~0.5 MB cada una, con su propia copia del
// runtime de Next y de supabase-js): sueltas dejaban el bundle del Worker en 3.08 MiB
// comprimido y Cloudflare Pages rechaza el deploy pasando de 3 MiB. Unificadas queda
// en ~1.98 MiB. Las URLs no cambian.
// ponytail: si el proyecto pasa a Workers Paid (tope 10 MiB) se pueden volver a separar.

const action = (request: Request) => facialSyncAction(request.url)

const notFound = () => NextResponse.json({ error: 'Ruta no encontrada' }, { status: 404 })

export async function GET(request: Request) {
  return action(request) === 'pending' ? pending(request) : notFound()
}

export async function POST(request: Request) {
  switch (action(request)) {
    case '':                  return registerUser(request)
    case 'bulk':              return bulk(request)
    case 'bulk/status':       return bulkStatus(request)
    case 'embeddings':        return embeddings(request)
    case 'register-existing': return registerExisting(request)
    case 'status':            return userStatus(request)
    default:                  return notFound()
  }
}

export async function PATCH(request: Request) {
  return action(request) === '' ? updateUser(request) : notFound()
}

export async function PUT(request: Request) {
  return action(request) === 'membership' ? membership(request) : notFound()
}

// -- / (alta y edicion individual) --

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

async function registerUser(request: Request) {
  const body: RegisterUserPayload = await request.json()
  const call = await callFacialApi<FacialSyncResponse>('/api/sync/user', { method: 'POST', body })
  if (!call.ok) return call.response
  await backupEmbedding(call.data)
  return NextResponse.json(call.data)
}

async function updateUser(request: Request) {
  const body: { supabase_user_id: number } & UpdateUserPatch = await request.json()
  const call = await callFacialApi<FacialSyncResponse>('/api/sync/user', { method: 'PATCH', body })
  if (!call.ok) return call.response
  await backupEmbedding(call.data)
  return NextResponse.json(call.data)
}

// -- /status --

async function userStatus(request: Request) {
  const body: { supabase_user_id: number } = await request.json()
  const call = await callFacialApi('/api/sync/user/status', { method: 'POST', body })
  return call.ok ? NextResponse.json(call.data) : call.response
}

// -- /register-existing --

async function registerExisting(request: Request) {
  const { clientId } = await request.json() as { clientId: number }
  if (!Number.isFinite(clientId)) {
    return NextResponse.json({ error: 'clientId inválido' }, { status: 400 })
  }

  const gate = await requireAuthedAdmin()
  if (!gate.ok) return gate.response

  const [payload] = await hydrateSyncPayloads(gate.data, [clientId])
  if (!payload) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  const call = await callFacialApi('/api/sync/user', { method: 'POST', body: payload })
  return call.ok ? NextResponse.json(call.data) : call.response
}

// -- /bulk --

async function bulk(request: Request) {
  const { clientIds } = await request.json() as { clientIds: number[] }
  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    return NextResponse.json({ error: 'clientIds vacío o inválido' }, { status: 400 })
  }

  const gate = await requireAuthedAdmin()
  if (!gate.ok) return gate.response

  const users = await hydrateSyncPayloads(gate.data, clientIds)
  if (users.length === 0) {
    return NextResponse.json({ error: 'No se encontraron clientes para registrar' }, { status: 404 })
  }

  // Dispara el job en background (RecFacialApi responde 202 al instante)
  const call = await callFacialApi('/api/sync/bulk', { method: 'POST', body: { users } })
  return call.ok ? NextResponse.json(call.data) : call.response
}

// -- /bulk/status --

async function bulkStatus(request: Request) {
  const { job_id } = await request.json() as { job_id: string }
  if (!job_id) {
    return NextResponse.json({ error: 'job_id requerido' }, { status: 400 })
  }

  // RecFacialApi ya no incluye el embedding en los results del bulk (se excluye en
  // process_bulk). Los embeddings se consultan aparte via /api/facial-sync/embeddings.
  const call = await callFacialApi('/api/sync/bulk/status', { method: 'POST', body: { job_id } })
  return call.ok ? NextResponse.json(call.data) : call.response
}

// -- /embeddings --

/**
 * Respalda en Supabase (tabla face_embedding) los embeddings de los clientes indicados.
 * Trae los vectores de RecFacialApi (POST /api/sync/users/embeddings) y los guarda con el
 * mismo helper que el alta individual. Los embeddings nunca salen hacia el navegador.
 */
async function embeddings(request: Request) {
  const { clientIds } = await request.json() as { clientIds: number[] }
  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    return NextResponse.json({ error: 'clientIds vacío o inválido' }, { status: 400 })
  }

  const gate = await requireAuthedAdmin()
  if (!gate.ok) return gate.response
  const adminClient = gate.data

  // 1. Saltar los clientes que YA tienen un embedding activo respaldado: son los que se
  //    restauraron, asi que el vector en RecFacialApi es identico al de Supabase (salio de aqui).
  //    Re-guardarlos solo generaria historial redundante. Solo respaldamos los que no tienen.
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

  const list = call.data?.data?.embeddings ?? []
  const missing = call.data?.data?.missing ?? []

  // 3. Guardar en Supabase (mismo helper que el alta individual)
  try {
    await saveEmbeddings(adminClient, list.map((e) => ({
      client_id:  e.supabase_user_id,
      embedding:  e.embedding,
      model_name: e.model_name,
    })))
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  return NextResponse.json({ saved: list.length, missing, skipped })
}

// -- /pending --

async function pending(request: Request) {
  const { searchParams } = new URL(request.url)
  const companyId = Number(searchParams.get('companyId'))
  if (!Number.isFinite(companyId)) {
    return NextResponse.json({ error: 'companyId inválido' }, { status: 400 })
  }

  const gate = await requireAuthedAdmin()
  if (!gate.ok) return gate.response

  // 1. Clientes de la compañia con membresia vigente (campos ligeros para la tabla).
  //    `!inner` descarta a quien no tiene ninguna suscripcion que llegue a hoy.
  const today = new Date().toISOString().split('T')[0]
  const { data: clients, error } = await gate.data
    .from('clients')
    .select('id, name, last_name, email, image_url, subscriptions!inner(id)')
    .eq('company_id', companyId)
    .gte('subscriptions.end_date', today)
    .order('id', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 2. IDs ya registrados en RecFacialApi (1 request)
  const call = await callFacialApi<{ data?: { ids?: number[] } }>('/api/sync/users/ids')
  if (!call.ok) return call.response

  // 3. Diff local
  const syncedSet = new Set<number>(call.data?.data?.ids ?? [])
  const allClients = clients ?? []
  const list = allClients
    .filter((c) => !syncedSet.has(c.id))
    // el join solo sirvio para filtrar; fuera de la respuesta
    .map(({ id, name, last_name, email, image_url }) => ({ id, name, last_name, email, image_url }))

  return NextResponse.json({
    pending: list,
    counts: {
      total: allClients.length,
      synced: allClients.length - list.length,
      pending: list.length,
    },
  })
}

// -- /membership --

const NO_IMAGE_MESSAGE =
  'El cliente no está en Facial API y no tiene foto. Regístralo desde la pestaña Biométricos.'

async function membership(request: Request) {
  const body: MembershipUpdatePayload = await request.json()

  const call = await callFacialApi('/api/sync/membership', { method: 'PUT', body })
  if (call.ok) return NextResponse.json(call.data)
  if (call.response.status !== 404) return call.response

  // 404 = el cliente nunca se registro en RecFacialApi (unico fail_not_found de ese
  // endpoint). El reconcile de membresias no lo alcanza: salta los client_id sin usuario,
  // asi que sin esto el cliente se queda fuera del facial indefinidamente. Lo damos de alta
  // aqui mismo con el payload completo (incluye el embedding respaldado, si lo hay).
  const gate = await requireAuthedAdmin()
  if (!gate.ok) return gate.response

  const [payload] = await hydrateSyncPayloads(gate.data, [body.supabase_user_id])
  if (!payload) return call.response

  // Sin foto el alta crearia un usuario sin embedding: su ID entraria en
  // /api/sync/users/ids, saldria del panel /facial-sync y contaria como "Vinculado"
  if (!payload.profile_picture_url) {
    return NextResponse.json(
      { success: false, error: NO_IMAGE_MESSAGE, message: NO_IMAGE_MESSAGE, status: 409, data: null, error_type: 'NO_IMAGE' },
      { status: 409 },
    )
  }

  const register = await callFacialApi<object>('/api/sync/user', { method: 'POST', body: payload })
  return register.ok
    ? NextResponse.json({ ...register.data, auto_registered: true })
    : register.response
}
