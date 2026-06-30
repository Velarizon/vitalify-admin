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

  return ((data ?? []) as HydrationRow[]).map((client) => {
    const latest = (client.subscriptions ?? [])
      .filter((s) => s.start_date && s.end_date)
      .sort((a, b) => (b.end_date ?? '').localeCompare(a.end_date ?? ''))[0]

    return {
      supabase_user_id:    client.id,
      email:               client.email ?? '',
      first_name:          client.name ?? '',
      last_name:           client.last_name ?? '',
      phone_number:        client.phone_number,
      gender:              client.gender,
      birth_date:          client.date_of_birth,
      profile_picture_url: client.image_url,
      membership: latest
        ? { membership_type: planName(latest), start_date: latest.start_date!, end_date: latest.end_date! }
        : undefined,
    }
  })
}
