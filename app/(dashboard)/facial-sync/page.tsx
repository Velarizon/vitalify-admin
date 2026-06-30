// app/(dashboard)/facial-sync/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { MetricCard } from '@/components/shared/metric-card'
import { TableSkeleton } from '@/components/shared/table-skeleton'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'
import { ScanFace, UserPlus, Loader2, WifiOff, Users } from 'lucide-react'
import FacialApi, { type PendingClient, type BulkJobData } from '@/lib/facial-api'

type Counts = { total: number; synced: number; pending: number }

export default function FacialSyncPage() {
  const { userData } = useAuthStore()
  const [pending, setPending] = useState<PendingClient[]>([])
  const [counts, setCounts] = useState<Counts | null>(null)
  const [loading, setLoading] = useState(true)
  const [registeringId, setRegisteringId] = useState<number | null>(null)
  const [offline, setOffline] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Bulk
  const [startingBulk, setStartingBulk] = useState(false)
  const [bulkJobId, setBulkJobId] = useState<string | null>(null)
  const [bulkProgress, setBulkProgress] = useState<BulkJobData | null>(null)

  const bulkRunning = bulkJobId !== null

  const load = useCallback(async () => {
    if (!userData) return
    setLoading(true)
    setOffline(false)
    setLoadError(null)
    try {
      const res = await FacialApi.getPendingUsers(userData.company.id)
      setPending(res.pending)
      setCounts(res.counts)
    } catch (err) {
      const e = err as Error & { errorType?: string }
      setLoadError(e.message)
      setOffline(e.errorType === 'CONNECTION_ERROR')
    } finally {
      setLoading(false)
    }
  }, [userData])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [load])

  // Polling del job bulk: pending → running → completed (para cuando completa)
  useEffect(() => {
    if (!bulkJobId) return

    let cancelled = false
    let timeoutId = 0

    const poll = async () => {
      try {
        const res = await FacialApi.getBulkJob(bulkJobId)
        if (cancelled) return
        setBulkProgress(res.data)

        if (res.data.status === 'completed') {
          const { synced, synced_without_embedding, failed } = res.data
          toast.success(`Registro masivo completado · ${synced} con embedding · ${synced_without_embedding} sin embedding · ${failed} fallidos`)
          setBulkJobId(null)
          void load()
          return
        }
        timeoutId = window.setTimeout(poll, 2000)
      } catch (err) {
        if (cancelled) return
        toast.error((err as Error).message)
        setBulkJobId(null)
      }
    }

    timeoutId = window.setTimeout(poll, 1500)
    return () => { cancelled = true; window.clearTimeout(timeoutId) }
  }, [bulkJobId, load])

  const handleRegister = async (client: PendingClient) => {
    setRegisteringId(client.id)
    const toastId = toast.loading(`Registrando a ${client.name ?? 'usuario'}...`)
    try {
      const res = await FacialApi.registerExisting(client.id)
      if (res.data?.warning) toast.warning(`Registrado con advertencia: ${res.data.warning}`, { id: toastId })
      else toast.success('Usuario registrado en Facial API', { id: toastId })

      setPending((prev) => prev.filter((p) => p.id !== client.id))
      setCounts((c) => c ? { ...c, synced: c.synced + 1, pending: c.pending - 1 } : c)
    } catch (err) {
      toast.error((err as Error).message, { id: toastId })
    } finally {
      setRegisteringId(null)
    }
  }

  const handleBulkRegister = async () => {
    const ids = pending.map((p) => p.id)
    if (ids.length === 0) return
    setStartingBulk(true)
    try {
      const res = await FacialApi.startBulkRegister(ids)
      if (!res.data?.job_id) throw new Error(res.message || 'No se recibió job_id')
      setBulkProgress({
        job_id: res.data.job_id, status: 'pending', total: res.data.total,
        processed: 0, synced: 0, synced_without_embedding: 0, failed: 0, results: [],
      })
      setBulkJobId(res.data.job_id)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setStartingBulk(false)
    }
  }

  const columns: ColumnDef<PendingClient>[] = [
    {
      id: 'identidad',
      header: 'Miembro',
      accessorFn: (row) => `${row.name ?? ''} ${row.last_name ?? ''}`.trim(),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-white/5 ring-1 ring-white/5">
            <AvatarImage src={row.original.image_url ?? ''} className="object-cover" />
            <AvatarFallback className="text-[10px] bg-secondary/50 text-primary font-black">
              {row.original.name?.[0]}{row.original.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-tight text-foreground/90">
              {row.original.name} {row.original.last_name}
            </span>
            <span className="text-[9px] text-muted-foreground/60 uppercase tracking-widest font-mono">
              ID {row.original.id.toString().padStart(6, '0')}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <span className="text-[11px] text-muted-foreground font-mono">{row.original.email || '—'}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            size="sm"
            className="h-7 px-3 text-[9px] uppercase font-black tracking-[0.15em] gap-1.5 bg-primary text-primary-foreground shadow-neon"
            onClick={() => handleRegister(row.original)}
            disabled={registeringId === row.original.id || bulkRunning}
          >
            {registeringId === row.original.id
              ? <><Loader2 className="h-2.5 w-2.5 animate-spin" /> Registrando</>
              : <><UserPlus className="h-2.5 w-2.5" /> Registrar</>}
          </Button>
        </div>
      ),
    },
  ]

  const progressPct = bulkProgress && bulkProgress.total > 0
    ? Math.round((bulkProgress.processed / bulkProgress.total) * 100)
    : 0

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-white/5 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ScanFace className="h-4 w-4 text-primary" />
            <h1 className="text-2xl font-heading font-black uppercase italic tracking-tighter">Sincronización Facial</h1>
          </div>
          <p className="text-technical tracking-[0.3em]">Miembros sin vincular con Facial API</p>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard title="Total Miembros" value={counts?.total ?? 0} subtitle="Base de datos del gimnasio" />
        <MetricCard title="Vinculados" value={counts?.synced ?? 0} className="border-primary/20" subtitle="Registrados en Facial API" />
        <MetricCard title="Pendientes" value={counts?.pending ?? 0} className="border-destructive/20" subtitle="Faltan de registrar" />
      </div>

      {/* Aviso offline / error */}
      {!loading && loadError && (
        <div className={`flex items-start gap-3 rounded-lg border p-3 ${offline ? 'border-destructive/25 bg-destructive/10' : 'border-[#FF9F0A]/25 bg-[#FF9F0A]/10'}`}>
          <WifiOff className={`mt-0.5 h-4 w-4 shrink-0 ${offline ? 'text-destructive' : 'text-[#FF9F0A]'}`} />
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${offline ? 'text-destructive' : 'text-[#FF9F0A]'}`}>
              {offline ? 'Facial API sin conexión' : 'No se pudo cargar la lista'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{loadError}</p>
          </div>
        </div>
      )}

      {/* Barra de progreso del registro masivo */}
      {bulkRunning && bulkProgress && (
        <div className="glass-panel rounded-lg p-4 space-y-3 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                {bulkProgress.status === 'pending' ? 'Iniciando registro masivo...' : 'Registrando miembros...'}
              </p>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground">
              {bulkProgress.processed} / {bulkProgress.total} ({progressPct}%)
            </p>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary/40 overflow-hidden">
            <div className="h-full bg-primary shadow-neon transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="flex gap-4 text-[9px] uppercase tracking-widest text-muted-foreground/70 font-bold">
            <span className="text-primary">{bulkProgress.synced} con foto correcta</span>
            <span className="text-[#FF9F0A]">{bulkProgress.synced_without_embedding} sin foto</span>
            <span className="text-destructive">{bulkProgress.failed} fallidos</span>
          </div>
        </div>
      )}

      {loading ? (
        <TableSkeleton />
      ) : !loadError && (
        <DataTable
          columns={columns}
          data={pending}
          searchPlaceholder="Buscar miembro pendiente..."
          toolbar={
            <Button
              size="sm"
              className="h-9 text-[10px] uppercase font-black tracking-widest gap-2 bg-primary text-primary-foreground shadow-neon"
              onClick={handleBulkRegister}
              disabled={pending.length === 0 || startingBulk || bulkRunning}
            >
              {startingBulk || bulkRunning
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Procesando</>
                : <><Users className="h-3.5 w-3.5" /> Registrar todos ({counts?.pending ?? 0})</>}
            </Button>
          }
        />
      )}
    </div>
  )
}
