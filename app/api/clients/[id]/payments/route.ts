import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { Database } from '@/types/supabase'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const runtime = 'edge'

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) return null

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function readMetadataString(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

async function getResponsibleByUserId(adminClient: ReturnType<typeof createAdminClient>, userId: string | null) {
  if (!adminClient || !userId) return null

  const { data, error } = await adminClient.auth.admin.getUserById(userId)
  if (error) return { id: userId, displayName: null, email: null }

  const metadata = data.user.user_metadata ?? {}
  const name = readMetadataString(metadata, ['name', 'first_name', 'firstName', 'given_name'])
  const lastName = readMetadataString(metadata, ['last_name', 'lastName', 'family_name'])
  const fullName = readMetadataString(metadata, ['full_name', 'fullName', 'display_name'])

  return {
    id: userId,
    displayName: fullName ?? ([name, lastName].filter(Boolean).join(' ') || null),
    email: data.user.email ?? null,
  }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const clientId = Number(id)

  if (!Number.isFinite(clientId)) {
    return NextResponse.json({ error: 'Cliente inválido' }, { status: 400 })
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

  const { data: subscriptions, error: subscriptionsError } = await adminClient
    .from('subscriptions')
    .select('id, plan_id, start_date, end_date, plans(name)')
    .eq('client_id', clientId)
    .order('start_date', { ascending: false })

  if (subscriptionsError) {
    return NextResponse.json({ error: subscriptionsError.message }, { status: 500 })
  }

  const subscriptionIds = (subscriptions ?? []).map((subscription) => subscription.id)
  if (subscriptionIds.length === 0) {
    return NextResponse.json({ subscriptions: [], payments: [] })
  }

  const { data: payments, error: paymentsError } = await adminClient
    .from('payments')
    .select('id, amount, payment_method, payment_date, payment_type, subscription_id, registered_by, subscriptions(id, plans(name))')
    .in('subscription_id', subscriptionIds)
    .order('payment_date', { ascending: false })

  if (paymentsError) {
    return NextResponse.json({ error: paymentsError.message }, { status: 500 })
  }

  const responsibleIds = Array.from(new Set((payments ?? []).map(payment => payment.registered_by).filter(Boolean))) as string[]
  const responsibleEntries = await Promise.all(
    responsibleIds.map(async (userId) => [userId, await getResponsibleByUserId(adminClient, userId)] as const)
  )
  const responsibleById = new Map(responsibleEntries)

  return NextResponse.json({
    subscriptions: subscriptions ?? [],
    payments: (payments ?? []).map((payment) => ({
      ...payment,
      responsible: payment.registered_by ? responsibleById.get(payment.registered_by) ?? null : null,
    })),
  })
}
