// app/(dashboard)/layout.tsx
'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { ShiftBlocker } from '@/components/layout/shift-blocker'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { getActiveShift } from '@/lib/supabase/actions/shifts'
import { cn } from '@/lib/utils'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [activeShift, setActiveShift] = useState<{ id: number; opened_at: string } | null>(null)
  const [shiftChecked, setShiftChecked] = useState(false)
  const { role } = useAuthStore()
  const { selectedLocation, sidebarOpen } = usePreferencesStore()

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
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      
      <div 
        className={cn(
          "min-h-screen transition-all duration-300 ease-in-out flex flex-col",
          sidebarOpen ? "pl-[200px]" : "pl-14",
          "max-md:pl-0"
        )}
      >
        <Topbar
          hasActiveShift={!!activeShift}
          activeShiftOpenedAt={activeShift?.opened_at}
          onOpenDoor={handleOpenDoor}
        />
        
        <main className="flex-1 pt-24 pb-12">
          {/* Asymmetric Breathing Room: 5% Right Margin */}
          <div className="px-6 max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

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
