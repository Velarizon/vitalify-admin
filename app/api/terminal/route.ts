// app/api/terminal/route.ts
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  // This route can be used to handle webhooks from the terminal if needed
  return NextResponse.json({ ok: true })
}
