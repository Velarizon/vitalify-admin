import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const apiUrl = process.env.FACIAL_API_URL
  const syncKey = process.env.FACIAL_SYNC_KEY

  if (!apiUrl || !syncKey) {
    return NextResponse.json({ error: 'Facial API not configured' }, { status: 503 })
  }

  const { job_id } = await request.json() as { job_id: string }
  if (!job_id) {
    return NextResponse.json({ error: 'job_id requerido' }, { status: 400 })
  }

  let res: Response
  try {
    res = await fetch(`${apiUrl}/api/sync/bulk/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'vitalify-sync-key': syncKey },
      body: JSON.stringify({ job_id }),
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

  const json = await res.json()

  if (Array.isArray(json?.data?.results)) {
    json.data.results = (json.data.results as Array<Record<string, unknown>>).map((r) => {
      const rest = { ...r }
      delete rest.embedding
      return rest
    })
  }

  return NextResponse.json(json)
}
