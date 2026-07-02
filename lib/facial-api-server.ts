import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Helpers server-side para las rutas de `app/api/facial-sync/*`.
 *
 * NO importar desde componentes del navegador: usa `next/server` y el service role.
 * El cliente para el navegador es `lib/facial-api.ts` (fetch a rutas relativas /api/...).
 *
 * Patrón de uso — cada helper devuelve un `Result`. En un route handler:
 *
 *   const gate = await requireAuthedAdmin()
 *   if (!gate.ok) return gate.response
 *   const admin = gate.data
 *
 *   const call = await callFacialApi('/api/sync/user', { method: 'POST', body })
 *   if (!call.ok) return call.response
 *   return NextResponse.json(call.data)
 */

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

/** Éxito con dato, o fallo con una NextResponse lista para devolver tal cual. */
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse }

const fail = (response: NextResponse): { ok: false; response: NextResponse } => ({ ok: false, response })

const CONNECTION_ERROR_MESSAGE = 'Facial API no disponible. Verifica que el servicio esté en línea.'

function getFacialConfig(): { apiUrl: string; syncKey: string } | null {
  const apiUrl = process.env.FACIAL_API_URL
  const syncKey = process.env.FACIAL_SYNC_KEY
  if (!apiUrl || !syncKey) return null
  return { apiUrl, syncKey }
}

/**
 * Proxy hacia RecFacialApi. Centraliza: check de config (503), el header secreto
 * `vitalify-sync-key`, el manejo de red caída (CONNECTION_ERROR 503) y el reenvío de
 * errores upstream. Las respuestas de error incluyen tanto `error` como `message` para
 * que cualquier consumidor (lib/facial-api.ts lee uno u otro) muestre el texto correcto.
 */
export async function callFacialApi<T = unknown>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<Result<T>> {
  const config = getFacialConfig()
  if (!config) {
    return fail(NextResponse.json({ error: 'Facial API not configured' }, { status: 503 }))
  }

  const { method = 'GET', body } = init ?? {}
  const hasBody = body !== undefined

  let res: Response
  try {
    res = await fetch(`${config.apiUrl}${path}`, {
      method,
      headers: {
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        'vitalify-sync-key': config.syncKey,
      },
      ...(hasBody ? { body: JSON.stringify(body) } : {}),
    })
  } catch {
    return fail(NextResponse.json(
      {
        success: false,
        error: CONNECTION_ERROR_MESSAGE,
        message: CONNECTION_ERROR_MESSAGE,
        status: 503,
        data: null,
        error_type: 'CONNECTION_ERROR',
      },
      { status: 503 },
    ))
  }

  if (!res.ok) {
    const json = await res.json().catch(() => ({
      success: false,
      message: 'Error desconocido',
      status: res.status,
      data: null,
      error_type: null,
    }))
    // Alias `error` <- `message` para las rutas cuyo cliente lee json.error (pending, embeddings).
    return fail(NextResponse.json({ ...json, error: json?.error ?? json?.message }, { status: res.status }))
  }

  return { ok: true, data: (await res.json()) as T }
}

/** 401 si no hay sesión Supabase. */
export async function requireUser(): Promise<Result<void>> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return fail(NextResponse.json({ error: 'No autenticado' }, { status: 401 }))
  }
  return { ok: true, data: undefined }
}

/** 500 si falta SUPABASE_SERVICE_ROLE_KEY; si no, devuelve el admin client. */
export function requireAdminClient(): Result<AdminClient> {
  const admin = createAdminClient()
  if (!admin) {
    return fail(NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY no está configurada.' }, { status: 500 }))
  }
  return { ok: true, data: admin }
}

/** Sesión válida + admin client, en un solo gate. Devuelve el admin client. */
export async function requireAuthedAdmin(): Promise<Result<AdminClient>> {
  const auth = await requireUser()
  if (!auth.ok) return auth
  return requireAdminClient()
}
