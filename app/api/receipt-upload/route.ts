// app/api/receipt-upload/route.ts
import { NextRequest, NextResponse } from 'next/server'

// In-memory store for receipt images (keyed by token)
const receipts = new Map<string, string>()

export async function POST(request: NextRequest) {
  const { token, image } = await request.json()
  if (!token || !image) return NextResponse.json({ error: 'Missing token or image' }, { status: 400 })
  receipts.set(token, image)
  return NextResponse.json({ ok: true })
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  const image = receipts.get(token)
  if (!image) return NextResponse.json({ image: null })
  receipts.delete(token)
  return NextResponse.json({ image })
}
