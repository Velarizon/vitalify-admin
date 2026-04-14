'use client'

import { useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { getLocations } from '@/lib/supabase/actions/locations'
import { useAuthStore } from '@/stores/auth'

type Location = Awaited<ReturnType<typeof getLocations>>[number]

const columns: ColumnDef<Location>[] = [
  { accessorKey: 'name', header: 'Nombre' },
  { accessorKey: 'city', header: 'Ciudad' },
  { accessorKey: 'address', header: 'Dirección' },
  { accessorKey: 'zip_code', header: 'CP' },
]

export default function LocationsPage() {
  const { userData } = useAuthStore()
  const [locations, setLocations] = useState<Location[]>([])

  useEffect(() => {
    if (!userData) return
    getLocations(userData.company.id).then(setLocations)
  }, [userData])

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Ubicaciones</h1>
      <DataTable columns={columns} data={locations} />
    </div>
  )
}
