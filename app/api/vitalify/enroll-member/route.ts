import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createGymMember } from '@/lib/vitalify/trainer-app'

export const runtime = 'edge'

// Enrolls a gym member in the trainer-app project, linked to the gym's trainer
// (companies.vitalify_id). Requires the gym to be registered first.
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const {
      companyId, localClientId, firstName, lastName, email, phone,
      startDate, endDate, planDuration, amount, currency, paymentMethod,
    } = await request.json()
    if (!companyId) return NextResponse.json({ error: 'companyId requerido' }, { status: 400 })
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Nombre, apellido y email son requeridos' }, { status: 400 })
    }

    const { data: company, error: companyError } = await (supabase.from('companies') as any)
      .select('vitalify_id')
      .eq('id', companyId)
      .single()

    if (companyError) {
      return NextResponse.json({ error: companyError.message }, { status: 500 })
    }
    if (!company?.vitalify_id) {
      return NextResponse.json({ error: 'El gimnasio no está registrado en Vitalify' }, { status: 409 })
    }

    const result = await createGymMember({
      trainerId: company.vitalify_id,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: String(email).trim().toLowerCase(),
      phone: phone ?? null,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      planDuration: planDuration ?? null,
      amount: amount ?? null,
      currency: currency ?? 'MXN',
      paymentMethod: paymentMethod ?? null,
    })

    if (localClientId) {
      const { error: persistError } = await (supabase.from('clients') as any)
        .update({ vitalify_client_id: result.clientId })
        .eq('id', localClientId)
      if (persistError) {
        console.warn('Failed to persist vitalify_client_id', persistError)
      }
    }

    return NextResponse.json({
      clientId: result.clientId,
      temporaryPassword: result.auth.temporaryPassword,
      passwordWasGenerated: result.auth.passwordWasGenerated,
      isNewAuthUser: result.auth.isNewAuthUser,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
