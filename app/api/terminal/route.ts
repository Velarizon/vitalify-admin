// app/api/terminal/route.ts
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST() {
  // This route can be used to handle webhooks from the terminal if needed
  return NextResponse.json({ ok: true })
}
