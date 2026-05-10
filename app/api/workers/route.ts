import { NextResponse } from 'next/server'
import { deactivateWorker, createWorker, updateWorker } from '@/lib/supabase/actions/workers'
import type { UserRole } from '@/stores/auth'

export const runtime = 'edge'

export async function POST(request: Request) {
  const body = await request.json()

  if (body.action === 'create') {
    const result = await createWorker(
      body.email,
      Number(body.companyId),
      Number(body.locationId),
      body.role as UserRole,
      body.profile
    )
    return NextResponse.json(result)
  }

  if (body.action === 'update') {
    const result = await updateWorker(Number(body.id), {
      name: body.name,
      last_name: body.lastName,
      role: body.role as UserRole,
      location_id: Number(body.locationId),
    })
    return NextResponse.json(result)
  }

  if (body.action === 'deactivate') {
    const result = await deactivateWorker(Number(body.id))
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}
