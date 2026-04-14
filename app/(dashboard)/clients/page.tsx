// app/(dashboard)/clients/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getClients } from '@/lib/supabase/actions/clients'
import { getActivePlans } from '@/lib/supabase/actions/plans'
import { useAuthStore } from '@/stores/auth'
import { Plus, MoreHorizontal, Pencil } from 'lucide-react'
import { TableSkeleton } from '@/components/shared/table-skeleton'
import { CreateClientWizard } from '@/components/clients/create-client-wizard'
import { EditClientDialog } from '@/components/clients/edit-client-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Client = Awaited<ReturnType<typeof getClients>>[number]

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
  const [showCreate, setShowCreate] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  const load = async () => {
    if (!userData) return
    const [cData, pData] = await Promise.all([
      getClients(userData.company.id),
      getActivePlans(userData.company.id)
    ])
    setClients(cData)
    setPlans(pData.map(p => ({
      id: p.id,
      name: p.name ?? 'Sin nombre',
      price: p.price ?? null,
      duration: p.duration ?? null,
    })))
    setLoading(false)
  }

  useEffect(() => { load() }, [userData])

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
      cell: ({ row }) => (row.original.subscriptions as any)?.[0]?.plans?.name ?? '—',
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
        <DataTable columns={columns} data={clients} searchPlaceholder="Buscar cliente..." />
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
    </div>
  )
}
