import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { RegisterUserPayload } from '@/lib/facial-api'

type AdminClient = SupabaseClient<Database>

type SubscriptionRow = {
  start_date: string | null
  end_date: string | null
  plans: { name: string | null } | { name: string | null }[] | null
}

type HydrationRow = {
  id: number
  email: string | null
  name: string | null
  last_name: string | null
  phone_number: string | null
  gender: string | null
  date_of_birth: string | null
  image_url: string | null
  subscriptions: SubscriptionRow[] | null
}

function planName(sub: SubscriptionRow) {
  const plans = sub.plans
  if (Array.isArray(plans)) return plans[0]?.name ?? 'Membresía'
  return plans?.name ?? 'Membresía'
}

/**
 * Construye los RegisterUserPayload para RecFacialApi a partir de los IDs de cliente.
 * Única fuente de verdad para armar payloads de sync (la usan los routes bulk y
 * register-existing); el navegador nunca arma estos payloads.
 */
export async function hydrateSyncPayloads(
  adminClient: AdminClient,
  clientIds: number[]
): Promise<RegisterUserPayload[]> {
  if (clientIds.length === 0) return []

  const { data, error } = await adminClient
    .from('clients')
    .select('id, email, name, last_name, phone_number, gender, date_of_birth, image_url, subscriptions(start_date, end_date, plans(name))')
    .in('id', clientIds)

  if (error) throw new Error(error.message)

  // Restauración: adjunta el embedding activo respaldado en Supabase para que RecFacialApi
  // no lo regenere (parte cara del sync) al migrar a una API/PC nueva. Los clientes sin
  // respaldo (nuevos reales) van sin embedding y se generan desde la foto como siempre.
  const { data: embRows, error: embError } = await adminClient
    .from('face_embedding')
    .select('client_id, embedding, model_name')
    .in('client_id', clientIds)
    .eq('active', true)
    .order('created_at', { ascending: false })
  if (embError) throw new Error(embError.message)

  const embByClient = new Map<number, { embedding: string | null; model_name: string }>()
  for (const row of embRows ?? []) {
    if (!embByClient.has(row.client_id)) embByClient.set(row.client_id, row) // el primero = el más reciente
  }

  return ((data ?? []) as HydrationRow[]).map((client) => {
    const latest = (client.subscriptions ?? [])
      .filter((s) => s.start_date && s.end_date)
      .sort((a, b) => (b.end_date ?? '').localeCompare(a.end_date ?? ''))[0]

    const emb = embByClient.get(client.id)

    return {
      supabase_user_id:    client.id,
      email:               client.email ?? '',
      first_name:          client.name ?? '',
      last_name:           client.last_name ?? '',
      phone_number:        client.phone_number,
      gender:              client.gender,
      birth_date:          client.date_of_birth,
      profile_picture_url: client.image_url,
      embedding:           emb?.embedding ?? null,
      model_name:          emb?.model_name ?? null,
      membership: latest
        ? { membership_type: planName(latest), start_date: latest.start_date!, end_date: latest.end_date! }
        : undefined,
    }
  })
}

export type EmbeddingToSave = {
  client_id:  number
  embedding:  string
  model_name: string
}


export async function saveEmbeddings(
  adminClient: AdminClient,
  items: EmbeddingToSave[]
): Promise<void> {
  if (items.length === 0) return

  const clientIds = items.map((i) => i.client_id)

  const { error: deactivateError } = await adminClient
    .from('face_embedding')
    .update({ active: false })
    .in('client_id', clientIds)
    .eq('active', true)
  if (deactivateError) throw new Error(deactivateError.message)

  const { error: insertError } = await adminClient
    .from('face_embedding')
    .insert(items.map((i) => ({
      client_id:  i.client_id,
      embedding:  i.embedding,
      model_name: i.model_name,
      active:     true,
      created_at: new Date().toISOString(),
    })))
  if (insertError) throw new Error(insertError.message)
}

/**
 * Segmento(s) despues de /api/facial-sync en la URL de la peticion: '', 'bulk',
 * 'bulk/status', ... Lo usa el route handler catch-all para despachar.
 */
export function facialSyncAction(url: string): string {
  return new URL(url).pathname
    .replace(/^\/api\/facial-sync\/?/, '')
    .replace(/\/$/, '')
}
