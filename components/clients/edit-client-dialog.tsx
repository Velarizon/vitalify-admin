'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateClient } from '@/lib/supabase/actions/clients'
import { toast } from 'sonner'

interface Props {
  client: {
    id: number
    name: string | null
    last_name: string | null
    email: string | null
    phone_number: string | null
    date_of_birth: string | null
    gender: string | null
  } | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function EditClientDialog({ client, open, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    last_name: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    gender: 'M',
  })

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        last_name: client.last_name || '',
        email: client.email || '',
        phone_number: client.phone_number || '',
        date_of_birth: client.date_of_birth || '',
        gender: client.gender || 'M',
      })
    }
  }, [client])

  const handleSave = async () => {
    if (!client) return
    setLoading(true)
    try {
      await updateClient(client.id, formData)
      toast.success('Cliente actualizado correctamente')
      onSuccess()
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar cliente</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-xs">Nombre</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="last_name" className="text-xs">Apellido</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={e => setFormData(p => ({ ...p, last_name: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone_number" className="text-xs">Teléfono</Label>
            <Input
              id="phone_number"
              value={formData.phone_number}
              onChange={e => setFormData(p => ({ ...p, phone_number: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="date_of_birth" className="text-xs">Fecha de nacimiento</Label>
            <Input
              id="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={e => setFormData(p => ({ ...p, date_of_birth: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="gender" className="text-xs">Género</Label>
            <Select 
              value={formData.gender} 
              onValueChange={v => setFormData(p => ({ ...p, gender: v ?? 'M' }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="F">Femenino</SelectItem>
                <SelectItem value="O">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading} size="sm" className="h-8 text-xs bg-primary">
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
