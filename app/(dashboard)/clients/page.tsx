// app/(dashboard)/clients/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getClientsPage } from '@/lib/supabase/actions/clients'
import { getActivePlans } from '@/lib/supabase/actions/plans'
import { useAuthStore } from '@/stores/auth'
import { Plus, MoreHorizontal, Pencil, RefreshCw } from 'lucide-react'
import { TableSkeleton } from '@/components/shared/table-skeleton'
import { CreateClientWizard } from '@/components/clients/create-client-wizard'
import { EditClientDialog } from '@/components/clients/edit-client-dialog'
import { RenewMembershipDialog } from '@/components/clients/renew-membership-dialog'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Client = Awaited<ReturnType<typeof getClientsPage>>['data'][number]

function statusBadge(client: Client) {
  const sub = client.subscriptions?.[0]
  if (!sub) return <Badge variant="outline" className="text-[#FF9F0A]">Baja</Badge>
  const expired = new Date() > new Date(sub.end_date ?? 0)
  return expired
    ? <Badge variant="destructive">Vencido</Badge>
    : <Badge className="bg-primary">Vigente</Badge>
}

export default function ClientsPage() {
  const { userData } = useAuthStore()
  const [clients, setClients] = useState<Client[]>([])
  const [plans, setPlans] = useState<{ id: number; name: string; price: number | null; duration: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [totalRows, setTotalRows] = useState(0)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [renewingClient, setRenewingClient] = useState<Client | null>(null)
  const debouncedSearch = useDebouncedValue(search, 300)

  const load = useCallback(async () => {
    if (!userData) return
    setLoading(true)
    try {
      const clientsResult = await getClientsPage(userData.company.id, {
        page: pageIndex + 1,
        pageSize,
        search: debouncedSearch,
      })
      setClients(clientsResult.data)
      setTotalRows(clientsResult.count)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, pageIndex, pageSize, userData])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [load])

  useEffect(() => {
    if (!userData) return

    void getActivePlans(userData.company.id).then((pData) => {
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
      header: 'Estado',
      cell: ({ row }) => statusBadge(row.original),
    },
    {
      header: 'Foto',
      cell: ({ row }) => (
        <Avatar className="h-6 w-6">
          <AvatarImage src={row.original.image_url ?? ''} />
          <AvatarFallback className="text-xs">
            {row.original.name?.[0]}{row.original.last_name?.[0]}
          </AvatarFallback>
        </Avatar>
      ),
    },
    { accessorKey: 'name', header: 'Nombre' },
    { accessorKey: 'last_name', header: 'Apellido' },
    {
      header: 'Plan',
      cell: ({ row }) => row.original.subscriptions?.[0]?.plans?.name ?? '—',
    },
    { accessorKey: 'email', header: 'Email' },
    {
      header: 'Edad',
      cell: ({ row }) => row.original.date_of_birth
        ? new Date().getFullYear() - new Date(row.original.date_of_birth).getFullYear()
        : '—',
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-6 w-6 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Acciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setEditingClient(row.original)}
              className="text-xs gap-2"
            >
              <Pencil className="h-3 w-3" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setRenewingClient(row.original)}
              className="text-xs gap-2"
            >
              <RefreshCw className="h-3 w-3" /> Renovar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Clientes</h1>
        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setShowCreate(true)}>
          <Plus size={13} /> Nuevo cliente
        </Button>
      </div>
      {loading ? (
        <TableSkeleton />
      ) : (
        <DataTable
          columns={columns}
          data={clients}
          searchPlaceholder="Buscar cliente..."
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
          search={{
            value: search,
            onChange: (value) => {
              setPageIndex(0)
              setSearch(value)
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
