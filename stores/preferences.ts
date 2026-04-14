// stores/preferences.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UserAccess } from './auth'

interface PreferencesStore {
  selectedLocation: UserAccess | null
  setSelectedLocation: (location: UserAccess | null) => void
}

export const usePreferencesStore = create(
  persist<PreferencesStore>(
    (set) => ({
      selectedLocation: null,
      setSelectedLocation: (location) => set({ selectedLocation: location }),
    }),
    { name: 'user-preferences' }
  )
)
