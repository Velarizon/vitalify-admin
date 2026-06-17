import { NextResponse } from 'next/server'
import type { RegisterUserPayload, UpdateUserPatch } from '@/lib/facial-api'

export async function POST(request: Request) {
  const apiUrl = process.env.FACIAL_API_URL
  const syncKey = process.env.FACIAL_SYNC_KEY

  if (!apiUrl || !syncKey) {
    return NextResponse.json({ error: 'Facial API not configured' }, { status: 503 })
  }

  const body: RegisterUserPayload = await request.json()

  const res = await fetch(`${apiUrl}/api/sync/user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'vitalify-sync-key': syncKey,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json({ error: text }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const apiUrl = process.env.FACIAL_API_URL
  const syncKey = process.env.FACIAL_SYNC_KEY

  if (!apiUrl || !syncKey) {
    return NextResponse.json({ error: 'Facial API not configured' }, { status: 503 })
  }

  const body: { supabase_user_id: number } & UpdateUserPatch = await request.json()

const res = await fetch(`${apiUrl}/api/sync/user`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'vitalify-sync-key': syncKey,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json({ error: text }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
