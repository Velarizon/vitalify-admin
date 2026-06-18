import { NextResponse } from 'next/server'
import type { MembershipUpdatePayload } from '@/lib/facial-api'

export async function PUT(request: Request) {
  const apiUrl = process.env.FACIAL_API_URL
  const syncKey = process.env.FACIAL_SYNC_KEY

  if (!apiUrl || !syncKey) {
    return NextResponse.json({ error: 'Facial API not configured' }, { status: 503 })
  }

  const body: MembershipUpdatePayload = await request.json()

  let res: Response
  try {
    res = await fetch(`${apiUrl}/api/sync/membership`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'vitalify-sync-key': syncKey,
      },
      body: JSON.stringify(body),
    })
  } catch {
    return NextResponse.json(
      { success: false, message: 'RecFacialApi no disponible. Verifica que el servicio esté en línea.', status: 503, data: null, error_type: 'CONNECTION_ERROR' },
      { status: 503 }
    )
  }

  if (!res.ok) {
    const json = await res.json().catch(() => ({ success: false, message: 'Error desconocido', status: res.status, data: null, error_type: null }))
    return NextResponse.json(json, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
