'use client'

import { useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { MetricCard } from '@/components/shared/metric-card'
import { TableSkeleton } from '@/components/shared/table-skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth'
import { getBrowserOverdueRenewals, updateBrowserClient } from '@/lib/supabase/browser-catalogs'
import { toast } from 'sonner'
import { UserX } from 'lucide-react'
import Terminal from '@/lib/terminal'

type Client = Awaited<ReturnType<typeof getBrowserOverdueRenewals>>[number]

const monthsSince = (isoDate: string) => {
  const then = new Date(isoDate)
  const now = new Date()
  return (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth())
}

export default function OverdueRenewalsPage() {
  const { userData } = useAuthStore()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [purging, setPurging] = useState(false)
  const [bajaIds, setBajaIds] = useState<Set<number>>(new Set())
  const [hideBaja, setHideBaja] = useState(false)

  const load = () => {
    if (!userData) return
    setLoading(true)
    getBrowserOverdueRenewals(userData.company.id, 4)
      .then(setClients)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => load(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [userData])

  const darBajaEnTerminal = async (client: Client) => {
    await Terminal.deleteUser(String(client.id))
    await updateBrowserClient(client.id, { is_sync: false })
  }

  const handleDarBajaUno = async (client: Client) => {
    if (!window.confirm(`¿Dar de baja a ${client.name} ${client.last_name} del terminal?`)) return
    setBajaIds(prev => new Set(prev).add(client.id))
    const toastId = toast.loading('Eliminando del terminal...')
    try {
      await darBajaEnTerminal(client)
      toast.success('Cliente dado de baja del terminal', { id: toastId })
      load()
    } catch (err) {
      toast.error((err as Error).message, { id: toastId })
    } finally {
      setBajaIds(prev => {
        const next = new Set(prev)
        next.delete(client.id)
        return next
      })
    }
  }

  const stillActive = clients.filter(c => c.is_sync !== false)
  const visibleClients = hideBaja ? stillActive : clients

  const handleDarBajaMasiva = async () => {
    if (!stillActive.length) return
    if (!window.confirm(`¿Dar de baja del terminal a los ${stillActive.length} clientes que siguen dados de alta?`)) return

    setPurging(true)
    const toastId = toast.loading(`Eliminando 0/${stillActive.length} del terminal...`)
    let done = 0
    let failed = 0
    for (const client of stillActive) {
      try {
        await darBajaEnTerminal(client)
      } catch {
        failed++
      }
      done++
      toast.loading(`Eliminando ${done}/${stillActive.length} del terminal...`, { id: toastId })
    }
    setPurging(false)
    if (failed) {
      toast.error(`Terminado con ${failed} error(es) de ${stillActive.length}`, { id: toastId })
    } else {
      toast.success(`${done} clientes dados de baja del terminal`, { id: toastId })
    }
    load()
  }

  const columns: ColumnDef<Client>[] = [
    {
      header: 'Cliente',
      cell: ({ row }) => `${row.original.name} ${row.original.last_name}`,
    },
    {
      header: 'Teléfono',
      cell: ({ row }) => row.original.phone_number ?? '—',
    },
    {
      header: 'Email',
      cell: ({ row }) => row.original.email ?? '—',
    },
    {
      header: 'Último plan',
      cell: ({ row }) => row.original.subscriptions?.[0]?.plans?.name ?? '—',
    },
    {
      header: 'Venció el',
      cell: ({ row }) => {
        const endDate = row.original.subscriptions?.[0]?.end_date
        return endDate ? new Date(endDate).toLocaleDateString('es-MX') : '—'
      },
    },
    {
      header: 'Meses sin renovar',
      cell: ({ row }) => {
        const endDate = row.original.subscriptions?.[0]?.end_date
        return endDate ? monthsSince(endDate) : '—'
      },
    },
    {
      header: 'Estado terminal',
      cell: ({ row }) => (
        row.original.is_sync !== false
          ? <Badge className="bg-primary/10 text-primary border-primary/20">Alta</Badge>
          : <Badge variant="outline" className="text-muted-foreground">Baja</Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        row.original.is_sync === false
          ? <span className="text-xs text-muted-foreground">Ya dado de baja</span>
          : (
            <Button
              size="sm"
              variant="destructive"
              disabled={purging || bajaIds.has(row.original.id)}
              onClick={() => handleDarBajaUno(row.original)}
            >
              <UserX size={14} className="mr-1" /> Dar de baja
            </Button>
          )
      ),
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="flex-1 text-lg font-semibold">Clientes sin renovar (4+ meses)</h1>
        <div className="flex items-center gap-2">
          <Switch id="hide-baja" checked={hideBaja} onCheckedChange={setHideBaja} />
          <Label htmlFor="hide-baja" className="text-xs text-muted-foreground">Ocultar ya dados de baja</Label>
        </div>
        <Button
          size="sm"
          variant="destructive"
          disabled={purging || stillActive.length === 0}
          onClick={handleDarBajaMasiva}
        >
          <UserX size={14} className="mr-1" /> Dar de baja del terminal ({stillActive.length})
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 w-fit">
        <MetricCard title="Total" value={clients.length} className="border-destructive/20" />
        <MetricCard title="Aún dados de alta" value={stillActive.length} className="border-primary/20" />
      </div>

      {loading ? <TableSkeleton /> : <DataTable columns={columns} data={visibleClients} />}
    </div>
  )
}
