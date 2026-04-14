// app/(dashboard)/workers/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { getWorkers } from '@/lib/supabase/actions/workers'
import { useAuthStore } from '@/stores/auth'

type Worker = Awaited<ReturnType<typeof getWorkers>>[number]

const columns: ColumnDef<Worker>[] = [
  { accessorKey: 'user_id', header: 'User ID', cell: ({ row }) => row.original.user_id?.slice(0, 8) + '...' },
  {
    header: 'Rol',
    cell: ({ row }) => (
      <Badge variant={row.original.role === 'admin' ? 'default' : 'outline'}>
        {row.original.role}
      </Badge>
    ),
  },
  {
    header: 'Ubicación',
    cell: ({ row }) => row.original.location?.name ?? '—',
  },
]

export default function WorkersPage() {
  const { userData } = useAuthStore()
  const [workers, setWorkers] = useState<Worker[]>([])

  useEffect(() => {
    if (!userData) return
    getWorkers(userData.company.id).then(setWorkers)
  }, [userData])

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Trabajadores</h1>
      <DataTable columns={columns} data={workers} />
    </div>
  )
}
