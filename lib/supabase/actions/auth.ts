// lib/supabase/actions/auth.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { UserData } from '@/stores/auth'
import { redirect } from 'next/navigation'

export async function login(email: string, password: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }
  return { error: null }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function getUserData(): Promise<{ userData: UserData | null; role: 'admin' | 'worker' | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { userData: null, role: null }

  const { data: accessRows } = await supabase
    .from('user_access')
    .select('role, location:locations(*), company:companies(*)')
    .eq('user_id', user.id)

  if (!accessRows || accessRows.length === 0) return { userData: null, role: null }

  const firstAccess = accessRows[0] as any
  const role = firstAccess.role as 'admin' | 'worker'

  const userData: UserData = {
    company: firstAccess.company,
    user_access: accessRows.map((a: any) => ({ location: a.location, role: a.role })),
  }

  return { userData, role }
}
