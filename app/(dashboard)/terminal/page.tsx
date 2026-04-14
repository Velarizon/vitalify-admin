// app/(dashboard)/terminal/page.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Fingerprint, DoorOpen, RefreshCcw } from 'lucide-react'
import { Terminal } from '@/lib/terminal'
import { toast } from 'sonner'
import { useState } from 'react'

export default function TerminalPage() {
  const [testing, setTesting] = useState(false)

  const handleOpen = async () => {
    const ok = await Terminal.openDoor()
    if (ok) toast.success('Comando de apertura enviado')
    else toast.error('No se pudo conectar con la terminal')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Configuración de Terminal</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <DoorOpen size={16} /> Control de Acceso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Prueba la conexión directa con el relevador de la puerta.
            </p>
            <Button size="sm" className="h-7 text-xs gap-1" onClick={handleOpen}>
              Abrir puerta ahora
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <RefreshCcw size={16} /> Estado del Agente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-xs font-medium">Buscando agente local...</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Asegúrate de que 'vitalify-terminal-agent' esté corriendo en esta computadora.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
