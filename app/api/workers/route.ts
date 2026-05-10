import { NextResponse } from 'next/server'
import { deactivateWorker, createWorker, updateWorker, getWorkersPage } from '@/lib/supabase/actions/workers'
import type { UserRole } from '@/stores/auth'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const companyId = Number(searchParams.get('companyId'))
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 })
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : undefined
  const pageSize = searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : undefined
  const search = searchParams.get('search') ?? undefined
  try {
    const result = await getWorkersPage(companyId, { page, pageSize, search })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

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
