import { NextResponse } from 'next/server'
import { hydrateSyncPayloads } from '@/lib/facial-sync'
import { callFacialApi, requireAuthedAdmin } from '@/lib/facial-api-server'

export async function POST(request: Request) {
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
