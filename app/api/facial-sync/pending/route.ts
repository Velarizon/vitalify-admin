import { NextResponse } from 'next/server'
import { callFacialApi, requireAuthedAdmin } from '@/lib/facial-api-server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const companyId = Number(searchParams.get('companyId'))
  if (!Number.isFinite(companyId)) {
    return NextResponse.json({ error: 'companyId inválido' }, { status: 400 })
  }

  const gate = await requireAuthedAdmin()
  if (!gate.ok) return gate.response

  // 1. Clientes de la compañía (campos ligeros para la tabla)
  const { data: clients, error } = await gate.data
    .from('clients')
    .select('id, name, last_name, email, image_url')
    .eq('company_id', companyId)
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
