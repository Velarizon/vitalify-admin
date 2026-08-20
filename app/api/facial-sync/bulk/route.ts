import { NextResponse } from 'next/server'
import { hydrateSyncPayloads } from '@/lib/facial-sync'
import { callFacialApi, requireAuthedAdmin } from '@/lib/facial-api-server'

export const runtime = 'edge'

export async function POST(request: Request) {
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
