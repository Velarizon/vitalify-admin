import { NextResponse } from 'next/server'
import { callFacialApi } from '@/lib/facial-api-server'

export const runtime = 'edge'

export async function POST(request: Request) {
  const { job_id } = await request.json() as { job_id: string }
  if (!job_id) {
    return NextResponse.json({ error: 'job_id requerido' }, { status: 400 })
  }

  // RecFacialApi ya no incluye el embedding en los results del bulk (se excluye en
  // process_bulk). Los embeddings se consultan aparte vía /api/facial-sync/embeddings.
  const call = await callFacialApi('/api/sync/bulk/status', { method: 'POST', body: { job_id } })
  return call.ok ? NextResponse.json(call.data) : call.response
}
