// components/layout/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Home, Users, CreditCard, ClipboardList, Timer,
  MapPin, BarChart3, UserCog, Fingerprint, Menu, X,
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
  const navItems = role === 'admin' ? [...generalItems, ...adminItems] : generalItems
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
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              isActive
                ? 'bg-secondary text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
          >
            <Icon size={18} className="flex-shrink-0" />
            {sidebarOpen && <span>{item.label}</span>}
          </Link>
        </TooltipTrigger>
        {!sidebarOpen && (
          <TooltipContent side="right"><p>{item.label}</p></TooltipContent>
        )}
      </Tooltip>
    )
  }

  return (
    <TooltipProvider delay={0}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-card border-r border-border flex flex-col z-40 transition-all duration-200',
          sidebarOpen ? 'w-[180px]' : 'w-12',
          // Mobile: hidden when closed
          !sidebarOpen && 'max-md:-translate-x-full'
        )}
      >
        {/* Header */}
        <div className={cn('flex items-center h-12 px-2 border-b border-border', sidebarOpen ? 'justify-between' : 'justify-center')}>
          {sidebarOpen && <span className="font-bold text-primary text-sm ml-1">⚡ Vitalify</span>}
          <button onClick={toggleSidebar} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
            {sidebarOpen ? <X size={16} className="text-muted-foreground" /> : <Menu size={16} className="text-muted-foreground" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-1.5 space-y-0.5 overflow-y-auto">
          {generalItems.map(renderItem)}
          {showAdmin && (
            <>
              <div className="my-2 mx-2 border-t border-border" />
              {adminItems.map(renderItem)}
            </>
          )}
        </nav>
      </aside>
    </TooltipProvider>
  )
}
