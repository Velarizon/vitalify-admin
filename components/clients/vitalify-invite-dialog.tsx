'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Smartphone, Copy, Check, MessageCircle } from 'lucide-react'

export interface VitalifyInvite {
  name: string
  email: string
  code: string | null
  phone: string | null
}

interface Props {
  invite: VitalifyInvite | null
  onClose: () => void
}

// Builds a wa.me link. Cleans the phone to digits; assumes Mexico (+52) when a
// bare 10-digit number is given.
function whatsappUrl(phone: string | null, message: string): string | null {
  if (!phone) return null
  let digits = phone.replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 10) digits = `52${digits}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export function VitalifyInviteDialog({ invite, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  const code = invite?.code ?? null
  const message = invite
    ? `Hola ${invite.name}, te comparto tu código de acceso para la app Vitalify:\n\n*${code}*\n\nAl activar tu cuenta ingresa tu email (${invite.email}) y este código.`
    : ''
  const waUrl = whatsappUrl(invite?.phone ?? null, message)

  const handleCopy = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <Dialog open={!!invite} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border/40">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 shadow-neon">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="text-base font-heading font-bold text-foreground">Miembro registrado en Vitalify</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">{invite?.name}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {code ? (
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-border/60 bg-background/60 p-4 space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Código de acceso</p>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-2xl font-bold tracking-[0.15em] text-primary break-all">{code}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="h-9 shrink-0 gap-2 text-[10px] uppercase font-bold tracking-widest"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
            </div>

            <div className="rounded-md bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
              El miembro activa su cuenta en la app con su email
              {' '}<span className="font-mono text-foreground">{invite?.email}</span>{' '}
              y este código. Luego crea su propia contraseña.
            </div>
          </div>
        ) : (
          <div className="pt-2 text-sm text-muted-foreground">
            Este miembro ya tenía una cuenta en Vitalify. Puede iniciar sesión con su contraseña
            actual y quedará vinculado automáticamente al gimnasio.
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="h-9 text-[10px] uppercase font-bold tracking-widest">
            Listo
          </Button>
          {code && waUrl && (
            <Button
              size="sm"
              onClick={() => window.open(waUrl, '_blank', 'noopener,noreferrer')}
              className="h-9 gap-2 text-[10px] uppercase font-bold tracking-widest bg-primary text-primary-foreground shadow-neon"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Enviar por WhatsApp
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
