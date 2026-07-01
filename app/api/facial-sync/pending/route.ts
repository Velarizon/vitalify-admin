import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const apiUrl = process.env.FACIAL_API_URL
  const syncKey = process.env.FACIAL_SYNC_KEY

  if (!apiUrl || !syncKey) {
    return NextResponse.json({ error: 'Facial API not configured' }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const companyId = Number(searchParams.get('companyId'))
  if (!Number.isFinite(companyId)) {
    return NextResponse.json({ error: 'companyId inválido' }, { status: 400 })
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

  // 1. Clientes de la compañía (campos ligeros para la tabla)
  const { data: clients, error } = await adminClient
    .from('clients')
    .select('id, name, last_name, email, image_url')
    .eq('company_id', companyId)
    .order('id', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 2. IDs ya registrados en RecFacialApi (1 request)
  let res: Response
  try {
    res = await fetch(`${apiUrl}/api/sync/users/ids`, {
      method: 'GET',
      headers: { 'vitalify-sync-key': syncKey },
    })
  } catch {
    return NextResponse.json(
      { error: 'Facial API no disponible. Verifica que el servicio esté en línea.', error_type: 'CONNECTION_ERROR' },
      { status: 503 }
    )
  }

  if (!res.ok) {
    const json = await res.json().catch(() => null)
    return NextResponse.json({ error: json?.message ?? 'Error al consultar RecFacialApi' }, { status: res.status })
  }

  const json = await res.json()
  const syncedSet = new Set<number>(json?.data?.ids ?? [])

  // 3. Diff local
  const allClients = clients ?? []
  const pending = allClients.filter((c) => !syncedSet.has(c.id))

  return NextResponse.json({
    pending,
    counts: {
      total: allClients.length,
      synced: allClients.length - pending.length,
      pending: pending.length,
    },
  })
}
