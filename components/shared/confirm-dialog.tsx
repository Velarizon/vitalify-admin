// components/shared/confirm-dialog.tsx
'use client'

import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'destructive' | 'default'
  loading?: boolean
  onConfirm: () => void
}

/**
 * Modal de confirmación reutilizable con el estilo Neon Dark de vitalify.
 * Reemplaza `window.confirm`. Controlado por `open` / `onOpenChange`.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const isDestructive = variant === 'destructive'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border/40" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'h-10 w-10 rounded-lg flex items-center justify-center border shrink-0',
                isDestructive
                  ? 'bg-destructive/10 border-destructive/20'
                  : 'bg-primary/10 border-primary/20 shadow-neon'
              )}
            >
              <AlertTriangle className={cn('h-5 w-5', isDestructive ? 'text-destructive' : 'text-primary')} />
            </div>
            <DialogTitle className="font-heading font-bold text-lg uppercase tracking-tight">
              {title}
            </DialogTitle>
          </div>
          {description && (
            <DialogDescription className="pt-2 text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <DialogFooter className="pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={isDestructive ? 'destructive' : 'default'}
            className={cn(
              'h-9 px-4 text-[10px] font-bold uppercase tracking-widest disabled:opacity-30',
              !isDestructive && 'bg-primary text-primary-foreground shadow-neon'
            )}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? 'Procesando...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
