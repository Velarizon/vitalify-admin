// app/(dashboard)/layout.tsx
'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { ShiftBlocker } from '@/components/layout/shift-blocker'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { getActiveShift } from '@/lib/supabase/actions/shifts'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeShift, setActiveShift] = useState<{ id: number; opened_at: string } | null>(null)
  const [shiftChecked, setShiftChecked] = useState(false)
  const { role } = useAuthStore()
  const { selectedLocation } = usePreferencesStore()

  useEffect(() => {
    if (!selectedLocation) return
    getActiveShift(selectedLocation.location.id).then(shift => {
      setActiveShift(shift)
      setShiftChecked(true)
    })
  }, [selectedLocation])

  const handleOpenDoor = async () => {
    const { Terminal } = await import('@/lib/terminal')
    Terminal.openDoor()
  }

  const showShiftBlocker = role === 'worker' && shiftChecked && !activeShift

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(p => !p)} />
      <Topbar
        isOpen={sidebarOpen}
        hasActiveShift={!!activeShift}
        activeShiftOpenedAt={activeShift?.opened_at}
        onOpenDoor={handleOpenDoor}
      />
      <main
        className="pt-12 min-h-screen transition-all duration-200"
        style={{ marginLeft: sidebarOpen ? 224 : 48 }}
      >
        <div className="p-4">{children}</div>
      </main>
      {showShiftBlocker && (
        <ShiftBlocker
          locationId={selectedLocation!.location.id}
          onShiftOpened={() => {
            getActiveShift(selectedLocation!.location.id).then(setActiveShift)
          }}
        />
      )}
    </div>
  )
}
