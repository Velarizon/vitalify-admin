export interface FacialMembership {
  membership_type: string
  start_date: string
  end_date: string
}

export interface RegisterUserPayload {
  supabase_user_id: number
  email: string
  first_name: string
  last_name: string
  phone_number?: string | null
  gender?: string | null
  birth_date?: string | null
  profile_picture_url?: string | null
  user_image_base64?: string | null
  // Embedding respaldado en Supabase. Si viene, RecFacialApi lo usa tal cual y NO regenera
  // (restauración tras migración/cambio de PC). model_name se ignora hasta que RecFacialApi
  // lo agregue a UserSyncPayload; sirve para preservar el modelo del vector guardado.
  embedding?: string | null
  model_name?: string | null
  membership?: FacialMembership
}

export interface UpdateUserPatch {
  email?: string
  first_name?: string
  last_name?: string
  phone_number?: string | null
  gender?: string | null
  birth_date?: string | null
  profile_picture_url?: string | null
  user_image_base64?: string | null
}

export interface MembershipUpdatePayload {
  supabase_user_id: number
  membership_type: string
  start_date: string
  end_date: string
}

export interface FacialSyncUserData {
  success: boolean
  user_id: number
  supabase_user_id: number
  embedding_synced: boolean
  embedding: string | null
  model_name: string | null
  warning: string | null
  error: string | null
}

export interface FacialSyncResponse {
  success: boolean
  message: string
  status: number
  data: FacialSyncUserData
  error_type: string | null
}

export interface FacialMembershipSyncResponse {
  success: boolean
  message: string
  status: number
  data: { user_id: number }
  error_type: string | null
  /** El cliente no existía en RecFacialApi y el route lo dio de alta en el momento. */
  auto_registered?: boolean
}

export interface PendingClient {
  id: number
  name: string | null
  last_name: string | null
  email: string | null
  image_url: string | null
}

export interface PendingUsersResponse {
  pending: PendingClient[]
  counts: { total: number; synced: number; pending: number }
}

export interface BulkStartResponse {
  success: boolean
  message: string
  status: number
  data: { job_id: string; total: number } | null
  error_type: string | null
}

export type BulkJobStatus = 'pending' | 'running' | 'completed'

export interface BulkResultItem {
  success: boolean
  user_id: number | null
  supabase_user_id: number | null
  embedding_synced: boolean
  warning: string | null
  error: string | null
}

export interface BulkJobData {
  job_id: string
  status: BulkJobStatus
  total: number
  processed: number
  synced: number
  synced_without_embedding: number
  failed: number
  results: BulkResultItem[]
}

export interface BulkJobResponse {
  success: boolean
  message: string
  status: number
  data: BulkJobData
  error_type: string | null
}

// Respuesta de RecFacialApi POST /api/sync/users/embeddings (la consume el proxy server-side)
export interface EmbeddingItem {
  supabase_user_id: number
  embedding: string
  model_name: string
}

export interface EmbeddingsResponse {
  success: boolean
  message: string
  status: number
  data: { embeddings: EmbeddingItem[]; missing: number[] }
  error_type: string | null
}

// Resumen que el proxy devuelve al navegador (sin exponer los embeddings)
export interface EmbeddingsBackupResult {
  saved: number
  missing: number[]
  skipped: number // clientes que ya tenían un embedding activo respaldado (no se re-guardan)
}

export type FacialBiometricStatus = 'ok' | 'not_found' | 'no_image' | 'no_embedding'

export interface FacialUserStatusData {
  status: FacialBiometricStatus
  message: string
  has_image: boolean
  has_embedding: boolean
  user_id: number
  supabase_user_id: number
}

export interface FacialUserStatusResponse {
  success: boolean
  message: string
  status: number
  data: FacialUserStatusData
  error_type: string | null
}

class FacialApi {
  async registerUser(payload: RegisterUserPayload): Promise<FacialSyncResponse> {
    const res = await fetch('/api/facial-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      throw new Error(json?.message ?? 'Error al registrar usuario en reconocimiento facial')
    }
    return res.json()
  }

  async updateUser(payload: { supabase_user_id: number } & UpdateUserPatch): Promise<FacialSyncResponse> {
    const res = await fetch('/api/facial-sync', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      throw new Error(json?.message ?? 'Error al actualizar usuario en reconocimiento facial')
    }
    return res.json()
  }

  async getUserStatus(supabase_user_id: number): Promise<FacialUserStatusResponse> {
    const res = await fetch('/api/facial-sync/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_user_id }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      const err = new Error(json?.message ?? 'Error al obtener estatus del usuario en reconocimiento facial') as Error & { errorType?: string }
      err.errorType = json?.error_type ?? null
      throw err
    }
    return res.json()
  }

  async getPendingUsers(companyId: number): Promise<PendingUsersResponse> {
    const res = await fetch(`/api/facial-sync/pending?companyId=${companyId}`)
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      const err = new Error(json?.error ?? 'Error al obtener usuarios pendientes de sincronización') as Error & { errorType?: string }
      err.errorType = json?.error_type ?? null
      throw err
    }
    return res.json()
  }

  async registerExisting(clientId: number): Promise<FacialSyncResponse> {
    const res = await fetch('/api/facial-sync/register-existing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      throw new Error(json?.message ?? json?.error ?? 'Error al registrar usuario en Facial API')
    }
    return res.json()
  }

  async startBulkRegister(clientIds: number[]): Promise<BulkStartResponse> {
    const res = await fetch('/api/facial-sync/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientIds }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      throw new Error(json?.message ?? json?.error ?? 'Error al iniciar el registro masivo')
    }
    return res.json()
  }

  async getBulkJob(jobId: string): Promise<BulkJobResponse> {
    const res = await fetch('/api/facial-sync/bulk/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      throw new Error(json?.message ?? json?.error ?? 'Error al consultar el progreso del registro masivo')
    }
    return res.json()
  }

  // Respalda en Supabase los embeddings de los clientes indicados. El proxy trae los
  // vectores de RecFacialApi y los guarda server-side; aquí solo llega el resumen.
  async syncEmbeddingsToSupabase(clientIds: number[]): Promise<EmbeddingsBackupResult> {
    const res = await fetch('/api/facial-sync/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientIds }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      throw new Error(json?.message ?? json?.error ?? 'Error al respaldar embeddings en Supabase')
    }
    return res.json()
  }

  async updateMembership(payload: MembershipUpdatePayload): Promise<FacialMembershipSyncResponse> {
    const res = await fetch('/api/facial-sync/membership', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      throw new Error(json?.message ?? 'Error al actualizar membresía en reconocimiento facial')
    }
    return res.json()
  }
}


export default new FacialApi()
