// components/layout/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Home, Users, CreditCard, ClipboardList, Timer,
  MapPin, BarChart3, UserCog, Fingerprint, ChevronRight, ChevronLeft,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth'

const allNavItems = [
  { label: 'Dashboard',     href: '/',          icon: Home,          adminOnly: false },
  { label: 'Clientes',      href: '/clients',   icon: Users,         adminOnly: false },
  { label: 'Pagos',         href: '/payments',  icon: CreditCard,    adminOnly: false },
  { label: 'Turnos',        href: '/shifts',    icon: Timer,         adminOnly: false },
  { label: 'Planes',        href: '/plans',     icon: ClipboardList, adminOnly: true  },
  { label: 'Ubicaciones',   href: '/locations', icon: MapPin,        adminOnly: true  },
  { label: 'Reportes',      href: '/reports',   icon: BarChart3,     adminOnly: true  },
  { label: 'Trabajadores',  href: '/workers',   icon: UserCog,       adminOnly: true  },
  { label: 'Terminal',      href: '/terminal',  icon: Fingerprint,   adminOnly: true  },
]

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { role } = useAuthStore()
  const navItems = allNavItems.filter(item => !item.adminOnly || role === 'admin')

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-emerald-900 text-emerald-100 flex flex-col transition-all duration-200 z-40',
          isOpen ? 'w-56' : 'w-12'
        )}
      >
        {/* Logo + toggle */}
        <div className={cn('flex items-center h-12 px-2 border-b border-emerald-800', isOpen ? 'justify-between' : 'justify-center')}>
          {isOpen && <span className="font-bold text-emerald-300 text-sm ml-1">⚡ Vitalify</span>}
          <button onClick={onToggle} className="p-1 rounded hover:bg-emerald-800 transition-colors">
            {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 mx-1 px-2 py-1.5 rounded text-sm transition-colors',
                      isActive
                        ? 'bg-emerald-700 text-white'
                        : 'text-emerald-300 hover:bg-emerald-800 hover:text-white'
                    )}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    {isOpen && <span>{item.label}</span>}
                  </Link>
                </TooltipTrigger>
                {!isOpen && (
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </nav>
      </aside>
    </TooltipProvider>
  )
}
