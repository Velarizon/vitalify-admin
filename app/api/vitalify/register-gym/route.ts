import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { registerTrainer } from '@/lib/vitalify/trainer-app'

export const runtime = 'edge'

// Registers the gym as a TRAINER in the trainer-app project and stores the
// resulting User.id + credentials on companies.vitalify_* (admin project).
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { companyId, email, password } = await request.json()
    if (!companyId) return NextResponse.json({ error: 'companyId requerido' }, { status: 400 })
    if (!email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const result = await registerTrainer(normalizedEmail, password)

    const { error: updateError } = await (supabase.from('companies') as any)
      .update({
        vitalify_id: result.userId,
        vitalify_email: normalizedEmail,
        vitalify_password: password,
      })
      .eq('id', companyId)

    if (updateError) {
      return NextResponse.json({ error: `Trainer creado pero no se pudo guardar en companies: ${updateError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      vitalifyId: result.userId,
      email: normalizedEmail,
      alreadyExisted: result.alreadyExisted,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
