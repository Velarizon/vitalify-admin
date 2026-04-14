// app/(dashboard)/clients/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getClients } from '@/lib/supabase/actions/clients'
import { getPlans } from '@/lib/supabase/actions/plans'
import { useAuthStore } from '@/stores/auth'
import { Plus } from 'lucide-react'
import { CreateClientSheet } from '@/components/clients/create-client-sheet'

type Client = Awaited<ReturnType<typeof getClients>>[number]

function statusBadge(client: Client) {
  const sub = client.subscriptions?.[0]
  if (!sub) return <Badge variant="outline" className="text-yellow-600">Baja</Badge>
  const expired = new Date() > new Date(sub.end_date ?? 0)
  return expired
    ? <Badge variant="destructive">Vencido</Badge>
    : <Badge className="bg-emerald-600">Vigente</Badge>
}

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
]

export default function ClientsPage() {
  const { userData } = useAuthStore()
  const [clients, setClients] = useState<Client[]>([])
  const [plans, setPlans] = useState<{ id: number; name: string; duration: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const load = async () => {
    if (!userData) return
    const [cData, pData] = await Promise.all([
      getClients(userData.company.id),
      getPlans(userData.company.id)
    ])
    setClients(cData)
    setPlans(pData.map(p => ({
      id: p.id,
      name: p.name ?? 'Sin nombre',
      duration: String(p.duration ?? '')
    })))
    setLoading(false)
  }

  useEffect(() => { load() }, [userData])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Clientes</h1>
        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setShowCreate(true)}>
          <Plus size={13} /> Nuevo cliente
        </Button>
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground">Cargando...</p>
      ) : (
        <DataTable columns={columns} data={clients} searchPlaceholder="Buscar cliente..." />
      )}
      <CreateClientSheet
        open={showCreate}
        onClose={() => { setShowCreate(false); load() }}
        plans={plans}
      />
    </div>
  )
}
