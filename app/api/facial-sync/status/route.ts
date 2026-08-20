import { NextResponse } from 'next/server'
import { callFacialApi } from '@/lib/facial-api-server'

export const runtime = 'edge'

export async function POST(request: Request) {
  const body: { supabase_user_id: number } = await request.json()
  const call = await callFacialApi('/api/sync/user/status', { method: 'POST', body })
  return call.ok ? NextResponse.json(call.data) : call.response
}
