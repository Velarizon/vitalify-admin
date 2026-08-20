import { NextResponse } from 'next/server'
import type { MembershipUpdatePayload } from '@/lib/facial-api'
import { callFacialApi, requireAuthedAdmin } from '@/lib/facial-api-server'
import { hydrateSyncPayloads } from '@/lib/facial-sync'

export const runtime = 'edge'

const NO_IMAGE_MESSAGE =
  'El cliente no está en Facial API y no tiene foto. Regístralo desde la pestaña Biométricos.'

export async function PUT(request: Request) {
  const body: MembershipUpdatePayload = await request.json()

  const call = await callFacialApi('/api/sync/membership', { method: 'PUT', body })
  if (call.ok) return NextResponse.json(call.data)
  if (call.response.status !== 404) return call.response

  // 404 = el cliente nunca se registró en RecFacialApi (único fail_not_found de ese
  // endpoint). El reconcile de membresías no lo alcanza: salta los client_id sin usuario,
  // así que sin esto el cliente se queda fuera del facial indefinidamente. Lo damos de alta
  // aquí mismo con el payload completo (incluye el embedding respaldado, si lo hay).
  const gate = await requireAuthedAdmin()
  if (!gate.ok) return gate.response

  const [payload] = await hydrateSyncPayloads(gate.data, [body.supabase_user_id])
  if (!payload) return call.response

  // Sin foto el alta crearía un usuario sin embedding: su ID entraría en
  // /api/sync/users/ids, saldría del panel /facial-sync y contaría como "Vinculado"
  if (!payload.profile_picture_url) {
    return NextResponse.json(
      { success: false, error: NO_IMAGE_MESSAGE, message: NO_IMAGE_MESSAGE, status: 409, data: null, error_type: 'NO_IMAGE' },
      { status: 409 },
    )
  }

  const register = await callFacialApi<object>('/api/sync/user', { method: 'POST', body: payload })
  return register.ok
    ? NextResponse.json({ ...register.data, auto_registered: true })
    : register.response
}
