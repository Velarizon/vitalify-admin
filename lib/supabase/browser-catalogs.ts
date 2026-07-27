import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { escapeForLike, normalizePagination, type PaginatedResult, type PaginationParams } from '@/lib/supabase/actions/pagination'
import { computeShiftTotals } from '@/lib/shifts'
import type { Database } from '@/types/supabase'

type ClientRow = Database['public']['Tables']['clients']['Row'] & {
  is_sync?: boolean | null
  vitalify_client_id?: number | null
  subscriptions?: {
    id: number
    plan_id: number | null
    start_date: string | null
    end_date: string | null
    plans?: { name: string | null } | null
  }[] | null
}

type PlanRow = Database['public']['Tables']['plans']['Row'] & {
  is_active?: boolean | null
}

type LocationRow = Database['public']['Tables']['locations']['Row']

type PaymentRow = Database['public']['Tables']['payments']['Row'] & {
  created_at?: string | null
  ticket_number?: string | null
  subscriptions?: {
    clients?: { name: string | null; last_name: string | null } | null
    plans?: { name: string | null } | null
  } | null
}

type ShiftRow = Database['public']['Tables']['shifts']['Row'] & {
  responsible: {
    id: string
    name: string | null
    last_name: string | null
    displayName: string | null
    email: string | null
  } | null
}

type WorkerRow = Database['public']['Tables']['user_access']['Row'] & {
  name?: string | null
  last_name?: string | null
  displayName?: string | null
  email?: string | null
  location?: LocationRow | null
}

export interface ClientSearchParams {
  name?: string
  lastName?: string
  phone?: string
}

function sortClientSubscriptions<T extends ClientRow>(clients: T[]): T[] {
  return clients.map(client => ({
    ...client,
    subscriptions: [...(client.subscriptions ?? [])].sort((a, b) =>
      new Date(b.end_date ?? 0).getTime() - new Date(a.end_date ?? 0).getTime()
    ),
  }))
}

export async function getBrowserClientsPage(
  companyId: number,
  params?: PaginationParams
): Promise<PaginatedResult<ClientRow> & { stats: { total: number; active: number; expired: number } }> {
  const supabase = createClient()
  const { page, pageSize, search, from, to } = normalizePagination(params)
  const today = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('clients')
    .select('*, subscriptions(id, plan_id, start_date, end_date, plans(name))', { count: 'exact' })
    .eq('company_id', companyId)
    .order('id', { ascending: false })

  if (search) {
    const value = escapeForLike(search)
    query = query.or(`name.ilike.%${value}%,last_name.ilike.%${value}%,email.ilike.%${value}%,phone_number.ilike.%${value}%`)
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw new Error(error.message)

  const [totalResult, activeResult, expiredResult] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase
      .from('clients')
      .select('id, subscriptions!inner(id)', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('subscriptions.end_date', today),
    supabase
      .from('clients')
      .select('id, subscriptions!inner(id)', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .lt('subscriptions.end_date', today),
  ])

  return {
    data: sortClientSubscriptions((data ?? []) as ClientRow[]),
    count: count ?? 0,
    page,
    pageSize,
    stats: {
      total: totalResult.count ?? 0,
      active: activeResult.count ?? 0,
      expired: expiredResult.count ?? 0,
    },
  }
}

export async function searchBrowserClients(
  companyId: number,
  search: ClientSearchParams,
  pagination?: PaginationParams
): Promise<PaginatedResult<ClientRow>> {
  const supabase = createClient()
  const { from, to, page, pageSize } = normalizePagination(pagination)

  let query = supabase
    .from('clients')
    .select('*, subscriptions(id, plan_id, start_date, end_date, plans(name))', { count: 'exact' })
    .eq('company_id', companyId)
    .order('id', { ascending: false })

  if (search.name) {
    query = query.ilike('name', `%${escapeForLike(search.name)}%`)
  }
  if (search.lastName) {
    query = query.ilike('last_name', `%${escapeForLike(search.lastName)}%`)
  }
  if (search.phone) {
    query = query.ilike('phone_number', `%${escapeForLike(search.phone)}%`)
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw new Error(error.message)

  return {
    data: sortClientSubscriptions((data ?? []) as ClientRow[]),
    count: count ?? 0,
    page,
    pageSize,
  }
}

export async function getBrowserPlansPage(
  companyId: number,
  params?: PaginationParams
): Promise<PaginatedResult<PlanRow>> {
  const supabase = createClient()
  const { page, pageSize, search, from, to } = normalizePagination(params)

  let query = supabase
    .from('plans')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .order('id', { ascending: false })

  if (search) {
    const value = escapeForLike(search)
    query = query.or(`name.ilike.%${value}%,duration.ilike.%${value}%,access_level.ilike.%${value}%`)
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw new Error(error.message)

  return { data: (data ?? []) as PlanRow[], count: count ?? 0, page, pageSize }
}

export async function getBrowserActivePlans(companyId: number): Promise<PlanRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active' as never, true as never)
  if (error) throw new Error(error.message)
  return (data ?? []) as PlanRow[]
}

export async function upsertBrowserPlan(plan: {
  id?: number
  name: string
  price: number
  duration: string
  description?: string
  access_level: string
  access_start_time?: string | null
  access_end_time?: string | null
  company_id: number
}) {
  const supabase = createClient()
  const { id, ...data } = plan
  const payload = data as Database['public']['Tables']['plans']['Insert']
  const { error } = id
    ? await supabase.from('plans').update(payload).eq('id', id)
    : await supabase.from('plans').insert(payload)
  if (error) throw new Error(error.message)
}

export async function toggleBrowserPlanActive(planId: number, isActive: boolean) {
  const supabase = createClient()
  const { error } = await supabase
    .from('plans')
    .update({ is_active: isActive } as never)
    .eq('id', planId)
  if (error) throw new Error(error.message)
}

export interface CompanyVitalify {
  vitalify_id: number | null
  vitalify_email: string | null
  vitalify_password: string | null
}

export async function getBrowserCompanyVitalify(companyId: number): Promise<CompanyVitalify> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('companies')
    .select('vitalify_id, vitalify_email, vitalify_password' as never)
    .eq('id', companyId)
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as CompanyVitalify
}

export async function getBrowserLocations(companyId: number): Promise<LocationRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('company_id', companyId)
    .order('id', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getBrowserLocationsPage(
  companyId: number,
  params?: PaginationParams
): Promise<PaginatedResult<LocationRow>> {
  const supabase = createClient()
  const { page, pageSize, search, from, to } = normalizePagination(params)

  let query = supabase
    .from('locations')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .order('id', { ascending: false })

  if (search) {
    const value = escapeForLike(search)
    query = query.or(`name.ilike.%${value}%,address.ilike.%${value}%,city.ilike.%${value}%,zip_code.ilike.%${value}%`)
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw new Error(error.message)

  return { data: data ?? [], count: count ?? 0, page, pageSize }
}

export async function upsertBrowserLocation(location: {
  id?: number
  name: string
  address?: string
  city?: string
  zip_code?: string
  company_id: number
}) {
  const supabase = createClient()
  const { id, ...data } = location
  const payload = data as Database['public']['Tables']['locations']['Insert']
  const { error } = id
    ? await supabase.from('locations').update(payload).eq('id', id)
    : await supabase.from('locations').insert(payload)
  if (error) throw new Error(error.message)
}

// --- Ads (anuncios de la pantalla de espera del kiosco; scope por location) ---
// La tabla `ads` aún no está en los tipos generados de Supabase → casts `as any`.

export interface AdRow {
  id: number
  location_id: number
  name: string
  video_url: string
  sort_order: number
  active: boolean
  created_at: string | null
}

// `ads` aún no está en los tipos generados; handle sin tipar por tabla (sin `any` explícito).
const adsDb = (): SupabaseClient => createClient() as unknown as SupabaseClient

export async function getBrowserAds(locationId: number): Promise<AdRow[]> {
  const { data, error } = await adsDb()
    .from('ads')
    .select('*')
    .eq('location_id', locationId)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as AdRow[]
}

export async function insertBrowserAd(ad: {
  location_id: number
  name: string
  video_url: string
  sort_order: number
}) {
  const { error } = await adsDb().from('ads').insert(ad)
  if (error) throw new Error(error.message)
}

export async function updateBrowserAd(id: number, updates: {
  name?: string
  sort_order?: number
  video_url?: string
}) {
  const { error } = await adsDb().from('ads').update(updates).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function toggleBrowserAdActive(id: number, active: boolean) {
  const { error } = await adsDb().from('ads').update({ active }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteBrowserAd(id: number) {
  const { error } = await adsDb().from('ads').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function createBrowserClientRecord(client: {
  name: string
  last_name: string
  email: string
  phone_number: string
  date_of_birth: string
  gender: string
  image_url?: string | null
  company_id: number
}) {
  const supabase = createClient()
  const { data, error } = await supabase.from('clients').insert(client).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateBrowserClient(clientId: number, updates: {
  name?: string
  last_name?: string
  email?: string
  phone_number?: string
  date_of_birth?: string
  gender?: string
  image_url?: string | null
  is_sync?: boolean | null
  is_image_sync?: boolean | null
}) {
  const supabase = createClient()
  const { error } = await supabase.from('clients').update(updates as any).eq('id', clientId)
  if (error) throw new Error(error.message)
}

export async function createBrowserSubscription(sub: {
  client_id: number
  plan_id: number
  location_id: number
  start_date: string
  end_date: string
}) {
  const supabase = createClient()
  const { data, error } = await supabase.from('subscriptions').insert(sub).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateBrowserSubscription(subscriptionId: number, updates: {
  plan_id?: number
  location_id?: number
  start_date?: string
  end_date?: string
}) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('subscriptions')
    .update(updates)
    .eq('id', subscriptionId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getBrowserPaymentsPage(
  locationId: number,
  params?: PaginationParams
): Promise<PaginatedResult<PaymentRow>> {
  const supabase = createClient()
  const { page, pageSize, search, from, to } = normalizePagination(params)

  let query = supabase
    .from('payments')
    .select('*, subscriptions(*, clients(*))', { count: 'exact' })
    .eq('location_id', locationId)
    .order('id', { ascending: false })

  if (search) {
    const value = escapeForLike(search)
    const numericSearch = Number(search)
    const filters = [`payment_method.ilike.%${value}%`]
    if (Number.isFinite(numericSearch)) {
      filters.push(`id.eq.${numericSearch}`, `shift_id.eq.${numericSearch}`, `subscription_id.eq.${numericSearch}`)
    }
    query = query.or(filters.join(','))
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw new Error(error.message)

  return { data: (data ?? []) as PaymentRow[], count: count ?? 0, page, pageSize }
}

export async function getBrowserPaymentsByMonth(locationId: number, year: number, month: number): Promise<PaymentRow[]> {
  const supabase = createClient()
  const start = new Date(year, month - 1, 1).toISOString()
  const end = new Date(year, month, 0, 23, 59, 59, 999).toISOString()

  const { data, error } = await supabase
    .from('payments')
    .select('*, subscriptions(*, clients(*), plans(*))')
    .eq('location_id', locationId)
    .gte('created_at' as never, start as never)
    .lte('created_at' as never, end as never)
    .order('created_at' as never, { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as PaymentRow[]
}

export async function createBrowserPayment(payment: {
  subscription_id: number
  amount: number
  payment_method: string
  location_id: number
  shift_id?: number | null
  registered_by?: string | null
  payment_type?: 'new_subscription' | 'renewal' | null
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let paymentType: 'new_subscription' | 'renewal' | null = payment.payment_type ?? null

  if (!paymentType && payment.subscription_id) {
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('client_id')
      .eq('id', payment.subscription_id)
      .single()
    if (subError) throw new Error(subError.message)

    if (subscription?.client_id) {
      const { count, error: countError } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', subscription.client_id)
        .neq('id', payment.subscription_id)
      if (countError) throw new Error(countError.message)
      paymentType = (count ?? 0) > 0 ? 'renewal' : 'new_subscription'
    }
  }

  const { data, error } = await supabase
    .from('payments')
    .insert({
      ...payment,
      payment_date: new Date().toISOString(),
      registered_by: user?.id ?? null,
      payment_type: paymentType,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function createBrowserVisitPayment(payment: {
  amount: number
  payment_method: string
  location_id: number
  ticket_number: string
  shift_id?: number | null
  registered_by?: string | null
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('payments')
    .insert({
      ...payment,
      subscription_id: null,
      payment_type: 'visit',
      payment_date: new Date().toISOString(),
      registered_by: user?.id ?? null,
    } as never)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function createBrowserAddonPayment(payment: {
  subscription_id?: number | null
  amount: number
  payment_method: string
  location_id: number
  shift_id?: number | null
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('payments')
    .insert({
      ...payment,
      subscription_id: payment.subscription_id ?? null,
      payment_type: null,
      payment_date: new Date().toISOString(),
      registered_by: user?.id ?? null,
    } as never)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getBrowserDayVisitPrice(companyId: number): Promise<number | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('companies')
    .select('day_visit_price' as never)
    .eq('id', companyId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as unknown as { day_visit_price: number | null } | null)?.day_visit_price ?? null
}

export async function updateBrowserDayVisitPrice(companyId: number, price: number) {
  const supabase = createClient()
  const { error } = await supabase
    .from('companies')
    .update({ day_visit_price: price } as never)
    .eq('id', companyId)
  if (error) throw new Error(error.message)
}

export async function getBrowserShiftsPage(
  locationId: number,
  params?: PaginationParams & { userId?: string }
): Promise<PaginatedResult<ShiftRow>> {
  const supabase = createClient()
  const { page, pageSize, search, from, to } = normalizePagination(params)

  let query = supabase
    .from('shifts')
    .select('*', { count: 'exact' })
    .eq('location_id', locationId)
    .order('opened_at', { ascending: false })

  if (params?.userId) query = query.eq('opened_by', params.userId)

  if (search) {
    const value = escapeForLike(search)
    const numericSearch = Number(search)
    const filters = [`notes.ilike.%${value}%`, `opened_by.ilike.%${value}%`]
    if (Number.isFinite(numericSearch)) filters.push(`id.eq.${numericSearch}`)
    query = query.or(filters.join(','))
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw new Error(error.message)

  return {
    data: ((data ?? []) as Database['public']['Tables']['shifts']['Row'][]).map(shift => ({
      ...shift,
      responsible: { id: shift.opened_by, name: null, last_name: null, displayName: null, email: null },
    })),
    count: count ?? 0,
    page,
    pageSize,
  }
}

export async function getBrowserWorkersPage(
  companyId: number,
  params?: PaginationParams
): Promise<PaginatedResult<WorkerRow>> {
  const { page, pageSize, search } = normalizePagination(params)
  const qs = new URLSearchParams({ companyId: String(companyId), page: String(page), pageSize: String(pageSize) })
  if (search) qs.set('search', search)
  const res = await fetch(`/api/workers?${qs}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<PaginatedResult<WorkerRow>>
}

export async function getBrowserShiftDetail(shiftId: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [shiftRes, paymentsRes] = await Promise.all([
    supabase.from('shifts').select('*').eq('id', shiftId).single(),
    supabase
      .from('payments')
      .select('*, subscriptions(*, clients(*))')
      .eq('shift_id', shiftId)
      .order('payment_date', { ascending: true }),
  ])
  if (shiftRes.error) throw new Error(shiftRes.error.message)

  const openedBy = shiftRes.data.opened_by
  let responsible: { id: string; name: string | null; last_name: string | null; displayName: string | null; email: string | null } = {
    id: openedBy,
    name: null,
    last_name: null,
    displayName: null,
    email: null,
  }

  if (openedBy) {
    try {
      const profileRes = await fetch(`/api/users?id=${encodeURIComponent(openedBy)}`)
      if (profileRes.ok) {
        const profile = await profileRes.json() as typeof responsible
        responsible = profile
      }
    } catch {
      // fall back to nulls
    }
  }

  return {
    shift: shiftRes.data,
    responsible,
    payments: (paymentsRes.data ?? []) as PaymentRow[],
    isMine: !!user && shiftRes.data.opened_by === user.id,
  }
}

export async function closeBrowserShift(shiftId: number, notes?: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: payments } = await supabase
    .from('payments')
    .select('amount, payment_method')
    .eq('shift_id', shiftId)

  const totals = computeShiftTotals(
    (payments ?? []).map(payment => ({ amount: payment.amount ?? 0, payment_method: payment.payment_method ?? '' }))
  )

  const { error } = await supabase
    .from('shifts')
    .update({ closed_at: new Date().toISOString(), notes: notes?.trim() || null, ...totals })
    .eq('id', shiftId)
    .eq('opened_by', user.id)
    .select('id')
    .single()

  return { error: error?.message ?? null }
}
