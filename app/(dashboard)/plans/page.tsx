'use client'

import { useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { getPlans } from '@/lib/supabase/actions/plans'
import { useAuthStore } from '@/stores/auth'

type Plan = Awaited<ReturnType<typeof getPlans>>[number]

const columns: ColumnDef<Plan>[] = [
  { accessorKey: 'name', header: 'Nombre' },
  { accessorKey: 'price', header: 'Precio', cell: ({ row }) =>
    row.original.price
      ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(row.original.price)
      : '—' },
  { accessorKey: 'duration', header: 'Duración' },
  { accessorKey: 'access_level', header: 'Acceso' },
  { accessorKey: 'description', header: 'Descripción' },
]

export default function PlansPage() {
  const { userData } = useAuthStore()
  const [plans, setPlans] = useState<Plan[]>([])

  useEffect(() => {
    if (!userData) return
    getPlans(userData.company.id).then(setPlans)
  }, [userData])

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Planes</h1>
      <DataTable columns={columns} data={plans} searchPlaceholder="Buscar plan..." />
    </div>
  )
}
