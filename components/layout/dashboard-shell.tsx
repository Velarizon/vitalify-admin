'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { ShiftBlocker } from '@/components/layout/shift-blocker'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { getBrowserActiveShift } from '@/lib/supabase/browser-shifts'
import { cn } from '@/lib/utils'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [activeShift, setActiveShift] = useState<{ id: number; opened_at: string } | null>(null)
  const [shiftChecked, setShiftChecked] = useState(false)
  const { role } = useAuthStore()
  const { selectedLocation, sidebarOpen } = usePreferencesStore()

  const refreshActiveShift = useCallback(async () => {
    if (!selectedLocation) return
    const shift = await getBrowserActiveShift(selectedLocation.location.id)
    setActiveShift(shift)
    setShiftChecked(true)
  }, [selectedLocation])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setShiftChecked(false)
      void refreshActiveShift()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [refreshActiveShift])

  useEffect(() => {
    const handleShiftChanged = () => {
      void refreshActiveShift()
    }

    window.addEventListener('vitalify:shift-changed', handleShiftChanged)
    return () => window.removeEventListener('vitalify:shift-changed', handleShiftChanged)
  }, [refreshActiveShift])

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
          activeShiftId={activeShift?.id}
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
            void refreshActiveShift()
          }}
        />
      )}
    </div>
  )
}
