export interface FacialMembership {
  membership_type: string
  start_date: string
  end_date: string
  is_active: boolean
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
  membership: FacialMembership
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

class FacialApi {
  async registerUser(payload: RegisterUserPayload): Promise<void> {
    const res = await fetch('/api/facial-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`FacialApi.registerUser failed: ${text}`)
    }
  }

  async updateUser(payload: { supabase_user_id: number } & UpdateUserPatch): Promise<void> {
    const res = await fetch('/api/facial-sync', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`FacialApi.updateUser failed: ${text}`)
    }
  }
}

export default new FacialApi()
