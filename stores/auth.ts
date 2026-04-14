// stores/auth.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Company {
  id: number
  name: string
  owner: string
  country: string
  club_type: string
  client_range: string
}

export interface Location {
  id: number
  city: string
  name: string
  address: string
  zip_code: string
  company_id: number
}

export type UserRole = 'admin' | 'worker'

export interface UserAccess {
  location: Location
  role: UserRole
}

export interface UserData {
  company: Company
  user_access: UserAccess[]
}

interface AuthStore {
  isAuthenticated: boolean
  userData: UserData | null
  role: UserRole | null
  setUserData: (userData: UserData, role: UserRole) => void
  clearUserData: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userData: null,
      role: null,
      setUserData: (userData, role) => set({ userData, role, isAuthenticated: true }),
      clearUserData: () => set({ userData: null, role: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage' }
  )
)
