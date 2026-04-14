// stores/preferences.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UserAccess } from './auth'

interface PreferencesStore {
  selectedLocation: UserAccess | null
  setSelectedLocation: (location: UserAccess | null) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      selectedLocation: null,
      setSelectedLocation: (location) => set({ selectedLocation: location }),
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    { name: 'user-preferences' }
  )
)
