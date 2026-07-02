import { NextResponse } from 'next/server'
import type { MembershipUpdatePayload } from '@/lib/facial-api'
import { callFacialApi } from '@/lib/facial-api-server'

export async function PUT(request: Request) {
  const body: MembershipUpdatePayload = await request.json()
  const call = await callFacialApi('/api/sync/membership', { method: 'PUT', body })
  return call.ok ? NextResponse.json(call.data) : call.response
}
