// components/layout/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Home, Users, CreditCard, ClipboardList, Timer,
  MapPin, BarChart3, UserCog, Fingerprint, X,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'

const generalItems = [
  { label: 'Dashboard',  href: '/',         icon: Home },
  { label: 'Clientes',   href: '/clients',  icon: Users },
  { label: 'Pagos',      href: '/payments', icon: CreditCard },
  { label: 'Turnos',     href: '/shifts',   icon: Timer },
]

const adminItems = [
  { label: 'Planes',       href: '/plans',     icon: ClipboardList },
  { label: 'Ubicaciones',  href: '/locations', icon: MapPin },
  { label: 'Reportes',     href: '/reports',   icon: BarChart3 },
  { label: 'Trabajadores', href: '/workers',   icon: UserCog },
  { label: 'Terminal',     href: '/terminal',  icon: Fingerprint },
]

export function Sidebar() {
  const pathname = usePathname()
  const { role } = useAuthStore()
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = usePreferencesStore()
  const showAdmin = role === 'admin'

  const renderItem = (item: (typeof generalItems)[number]) => {
    const Icon = item.icon
    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
    return (
      <Tooltip key={item.href}>
        <TooltipTrigger>
          <Link
            href={item.href}
            onClick={() => { if (typeof window !== 'undefined' && window.innerWidth < 768) setSidebarOpen(false) }}
            className={cn(
              'relative flex items-center gap-3 px-4 h-11 text-[10px] uppercase tracking-[0.2em] font-bold transition-all duration-200 rounded-lg group',
              isActive
                ? 'glass-panel text-primary'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            )}
          >
            <Icon size={16} className={cn(
              'flex-shrink-0 transition-transform duration-200 group-hover:scale-110',
              isActive ? 'text-primary' : 'text-white/40'
            )} />
            {sidebarOpen && (
              <span>{item.label}</span>
            )}
          </Link>
        </TooltipTrigger>
        {!sidebarOpen && (
          <TooltipContent side="right" className="text-[9px] uppercase tracking-widest font-bold">
            {item.label}
          </TooltipContent>
        )}
      </Tooltip>
    )
  }

  return (
    <TooltipProvider delay={0}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-sidebar border-r border-white/5 shadow-2xl flex flex-col z-40 transition-all duration-300 ease-in-out',
          sidebarOpen ? 'w-[200px]' : 'w-14',
          !sidebarOpen && 'max-md:-translate-x-full'
        )}
      >
        {/* Header / Logo Section */}
        <div className={cn(
          'flex items-center h-16 px-4 mb-4 border-b border-white/5',
          sidebarOpen ? 'justify-between' : 'justify-center'
        )}>
          {sidebarOpen && (
            <div className="flex items-center gap-2 animate-in fade-in duration-500">
              <div className="h-6 w-6 rounded-sm bg-primary flex items-center justify-center shadow-neon">
                <span className="text-[10px] font-black text-primary-foreground italic">V</span>
              </div>
              <span className="font-black text-xs uppercase tracking-[0.3em] text-foreground">
                Vitalify
              </span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded bg-primary/5 hover:bg-primary/10 border border-primary/10 transition-all group"
          >
            {sidebarOpen ? (
              <X size={14} className="text-primary group-hover:rotate-90 transition-transform" />
            ) : (
              <div className="h-6 w-6 rounded-sm bg-primary/10 flex items-center justify-center">
                <span className="text-[10px] font-black text-primary italic">V</span>
              </div>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 overflow-y-auto custom-scrollbar">
          {sidebarOpen && (
            <p className="px-2 mb-2 text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
              Principales
            </p>
          )}
          {generalItems.map(renderItem)}

          {showAdmin && (
            <div className="mt-6">
              {sidebarOpen && (
                <p className="px-2 mb-2 text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                  Administración
                </p>
              )}
              {adminItems.map(renderItem)}
            </div>
          )}
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-white/5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary glow-primary animate-pulse" />
              <span className="text-[8px] font-bold uppercase tracking-widest text-primary/60">Servidor Activo</span>
            </div>
          </div>
        )}
      </aside>
    </TooltipProvider>
  )
}
