// lib/vitalify/trainer-app.ts
// Server-only helper to call the trainer-app (Vitalify) Supabase Edge Functions.
// This talks to a DIFFERENT Supabase project than the rest of the admin
// (xeqsh... vs ekpuj...), authenticating with that project's anon key.
// Never import this from client components — it reads server-only env vars
// (no NEXT_PUBLIC_ prefix, so they are undefined in the browser anyway).

const URL = process.env.TRAINER_APP_SUPABASE_URL
const ANON = process.env.TRAINER_APP_SUPABASE_ANON_KEY
const SECRET = process.env.VITALIFY_INTEGRATION_SECRET

function assertConfigured() {
  if (!URL || !ANON) {
    throw new Error('Integración Vitalify no configurada (faltan TRAINER_APP_SUPABASE_URL / ANON_KEY)')
  }
}

async function invoke<T>(fn: string, body: unknown, extraHeaders: Record<string, string> = {}): Promise<T> {
  assertConfigured()
  const res = await fetch(`${URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON!,
      Authorization: `Bearer ${ANON}`,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  })

  let payload: any = null
  try {
    payload = await res.json()
  } catch {
    // non-JSON response
  }

  if (!res.ok) {
    throw new Error(payload?.error ?? `Error ${res.status} al llamar ${fn}`)
  }
  return payload as T
}

export interface RegisterTrainerResult {
  success: boolean
  userId: number
  authProviderId: string
  alreadyExisted: boolean
}

export function registerTrainer(email: string, password: string): Promise<RegisterTrainerResult> {
  return invoke<RegisterTrainerResult>('register-trainer', { email, password })
}

export interface CreateGymMemberResult {
  clientId: number
  trainerClientId: number
  membershipId: number | null
  auth: {
    email: string
    temporaryPassword: string | null
    passwordWasGenerated: boolean
    isNewAuthUser: boolean
  }
}

export function createGymMember(input: {
  trainerId: number
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  // membership period
  startDate?: string | null
  endDate?: string | null
  planDuration?: string | null
  amount?: number | null
  currency?: 'MXN' | 'USD' | null
  paymentMethod?: string | null
}): Promise<CreateGymMemberResult> {
  if (!SECRET) {
    throw new Error('Integración Vitalify no configurada (falta VITALIFY_INTEGRATION_SECRET)')
  }
  return invoke<CreateGymMemberResult>('create-gym-member', input, { 'x-vitalify-secret': SECRET })
}
