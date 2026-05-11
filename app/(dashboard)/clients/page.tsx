// app/(dashboard)/clients/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'
import { Plus, Pencil, RefreshCw, UserCheck, UserX, AlertCircle, Users, Shield } from 'lucide-react'
import { TableSkeleton } from '@/components/shared/table-skeleton'
import { CreateClientWizard } from '@/components/clients/create-client-wizard'
import { EditClientDialog } from '@/components/clients/edit-client-dialog'
import { RenewMembershipDialog } from '@/components/clients/renew-membership-dialog'
import { MetricCard } from '@/components/shared/metric-card'


import { 
  getBrowserActivePlans, 
  getBrowserClientsPage, 
  searchBrowserClients,    
  ClientSearchParams        
} from '@/lib/supabase/browser-catalogs'

import { ClientSearchBar } from '@/components/clients/client-search-bar'


type Client = Awaited<ReturnType<typeof getBrowserClientsPage>>['data'][number]

function statusBadge(client: Client) {
  const sub = client.subscriptions?.[0]
  if (!sub) return (
    <div className="flex items-center gap-1.5 text-[#FF9F0A]">
      <UserX className="h-3 w-3" />
      <span className="text-[9px] uppercase font-black tracking-widest">Baja</span>
    </div>
  )
  const expired = new Date() > new Date(sub.end_date ?? 0)
  return expired
    ? (
      <div className="flex items-center gap-1.5 text-destructive">
        <AlertCircle className="h-3 w-3" />
        <span className="text-[9px] uppercase font-black tracking-widest">Vencido</span>
      </div>
    )
    : (
      <div className="flex items-center gap-1.5 text-primary">
        <UserCheck className="h-3 w-3" />
        <span className="text-[9px] uppercase font-black tracking-widest">Vigente</span>
      </div>
    )
}

export default function ClientsPage() {
  const { userData } = useAuthStore()
  const [clients, setClients] = useState<Client[]>([])
  const [plans, setPlans] = useState<{ id: number; name: string; price: number | null; duration: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [totalRows, setTotalRows] = useState(0)
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0 })
  const [clientSearch, setClientSearch] = useState<ClientSearchParams>({})
  const [showCreate, setShowCreate] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [renewingClient, setRenewingClient] = useState<Client | null>(null)

  const load = useCallback(async () => {
  if (!userData) return
  setLoading(true)
  try {
    const hasSearch = clientSearch.name || clientSearch.lastName || clientSearch.phone

    const clientsResult = hasSearch
      ? await searchBrowserClients(userData.company.id, clientSearch, { page: pageIndex + 1, pageSize })
      : await getBrowserClientsPage(userData.company.id, { page: pageIndex + 1, pageSize })

    setClients(clientsResult.data)
    setTotalRows(clientsResult.count)
    if ('stats' in clientsResult) {
      setStats(clientsResult.stats as { total: number; active: number; expired: number })
    }
  } finally {
    setLoading(false)
  }
}, [clientSearch, pageIndex, pageSize, userData])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [load])

  useEffect(() => {
    if (!userData) return

    void getBrowserActivePlans(userData.company.id).then((pData) => {
      setPlans(pData.map(p => ({
        id: p.id,
        name: p.name ?? 'Sin nombre',
        price: p.price ?? null,
        duration: p.duration ? String(p.duration) : null,
      })))
    })
  }, [userData])

  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize))

  const columns: ColumnDef<Client>[] = [
    {
      header: 'Estado de Enlace',
      cell: ({ row }) => statusBadge(row.original),
    },
    {
      header: 'Identidad Miembro',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-white/5 ring-1 ring-white/5 group-hover:ring-primary/20 transition-all duration-300">
            <AvatarImage src={row.original.image_url ?? ''} className="object-cover" />
            <AvatarFallback className="text-[10px] bg-secondary/50 text-primary font-black">
              {row.original.name?.[0]}{row.original.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-tight text-foreground/90">{row.original.name} {row.original.last_name}</span>
            <span className="text-[9px] text-muted-foreground/60 uppercase tracking-widest font-mono italic">
              {row.original.email || 'NO_IDENTIFIER_SEC'}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Protocolo Plan',
      cell: ({ row }) => {
        const planName = row.original.subscriptions?.[0]?.plans?.name
        return (
          <div className="flex items-center gap-2">
            <Shield className="h-3 w-3 text-primary/40" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary italic">
              {planName ?? 'SIN_PLAN_ASIGNADO'}
            </span>
          </div>
        )
      },
    },
    {
      header: 'Vencimiento',
      cell: ({ row }) => {
        const endDate = row.original.subscriptions?.[0]?.end_date
        return (
          <span className="text-[10px] font-mono text-muted-foreground/80 tracking-tighter bg-secondary/30 px-2 py-0.5 rounded-sm">
            {endDate ? new Date(endDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : 'N/A'}
          </span>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 px-3 text-[9px] uppercase font-black tracking-[0.15em] gap-1.5 border-white/5 bg-secondary/20 hover:bg-primary/10 hover:text-primary transition-all"
            onClick={() => setEditingClient(row.original)}
          >
            <Pencil className="h-2.5 w-2.5" /> Editar
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 px-3 text-[9px] uppercase font-black tracking-[0.15em] gap-1.5 border-white/5 bg-secondary/20 hover:bg-primary/10 hover:text-primary transition-all"
            onClick={() => setRenewingClient(row.original)}
          >
            <RefreshCw className="h-2.5 w-2.5" /> Renovar
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HUD Header */}
      <div className="flex items-end justify-between border-b border-white/5 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h1 className="text-2xl font-heading font-black uppercase italic tracking-tighter">Terminal Miembros</h1>
          </div>
          <p className="text-technical tracking-[0.3em]">Gestión de Acceso y Membresías v2.4</p>
        </div>
        <Button 
          size="sm" 
          className="h-10 px-6 text-[10px] uppercase font-black tracking-[0.2em] gap-2 bg-primary text-black hover:bg-primary/90 shadow-neon italic"
          onClick={() => setShowCreate(true)}
        >
          <Plus size={14} className="stroke-[3px]" /> Registrar Nuevo Miembro
        </Button>
      </div>

      {/* Top Metrics Area */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard title="Total Registrados" value={stats.total} subtitle="Base de datos global" />
        <MetricCard title="Enlaces Activos" value={stats.active} className="border-primary/20" />
        <MetricCard title="Vencimientos" value={stats.expired} className="border-destructive/20" />
      </div>

      <ClientSearchBar
        onSearch={(params) => {
          setPageIndex(0)
          setClientSearch(params)
        }}
        onClear={() => {
          setPageIndex(0)
          setClientSearch({})
        }}
      />
      
      {loading && clients.length === 0 ? (
        <TableSkeleton />
      ) : (
        <DataTable
          columns={columns}
          data={clients}
          hideSearch
          pagination={{
            pageIndex,
            pageSize,
            pageCount,
            totalRows,
            onPageChange: (nextPageIndex) => setPageIndex(Math.max(0, Math.min(nextPageIndex, pageCount - 1))),
            onPageSizeChange: (nextPageSize) => {
              setPageIndex(0)
              setPageSize(nextPageSize)
            },
          }}
          
        />
      )}

      <CreateClientWizard
        open={showCreate}
        onClose={() => { setShowCreate(false); load() }}
        plans={plans}
      />
      <EditClientDialog
        client={editingClient}
        open={!!editingClient}
        onClose={() => setEditingClient(null)}
        onSuccess={load}
      />
      <RenewMembershipDialog
        client={renewingClient}
        open={!!renewingClient}
        onClose={() => setRenewingClient(null)}
        onSuccess={load}
      />
    </div>
  )
}
