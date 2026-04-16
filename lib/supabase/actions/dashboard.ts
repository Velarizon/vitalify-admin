// lib/supabase/actions/dashboard.ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function getDashboardData(companyId: number, locationId: number) {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const in30days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [clientsRes, paymentsRes, genderRes, plansRes, birthdaysRes, expirationsRes] = await Promise.all([
    supabase.from('subscriptions').select('id', { count: 'exact' })
      .eq('location_id', locationId)
      .gte('end_date', today),
    supabase.from('payments').select('amount')
      .eq('location_id', locationId)
      .gte('payment_date', firstOfMonth),
    supabase.from('clients').select('gender').eq('company_id', companyId),
    supabase.from('subscriptions').select('plans(name)', { count: 'exact' })
      .eq('location_id', locationId),
    supabase.from('clients').select('name, last_name, date_of_birth')
      .eq('company_id', companyId)
      .like('date_of_birth', `%-${today.slice(5)}`),
    supabase.from('subscriptions').select('id', { count: 'exact' })
      .eq('location_id', locationId)
      .gte('end_date', today)
      .lte('end_date', in30days),
  ])

  const totalClients = clientsRes.count ?? 0
  const monthlyRevenue = (paymentsRes.data ?? []).reduce((s, p) => s + (p.amount ?? 0), 0)
  const expirationsSoon = expirationsRes.count ?? 0

  const genderCount = { M: 0, F: 0, O: 0 }
  for (const c of genderRes.data ?? []) {
    const g = (c.gender ?? 'O') as 'M' | 'F' | 'O'
    genderCount[g] = (genderCount[g] ?? 0) + 1
  }

  const planMap: Record<string, number> = {}
  for (const s of plansRes.data ?? []) {
    const name = (s.plans as any)?.name ?? 'Sin plan'
    planMap[name] = (planMap[name] ?? 0) + 1
  }

  return {
    totalClients,
    monthlyRevenue,
    expirationsSoon,
    genderCount,
    planData: Object.entries(planMap).map(([name, value]) => ({ name, value })),
    todayBirthdays: birthdaysRes.data ?? [],
  }
}
