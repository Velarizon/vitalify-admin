// components/clients/step-personal.tsx
'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface PersonalData {
  name: string; last_name: string; email: string;
  phone_number: string; date_of_birth: string; gender: string
}

interface Props {
  data: PersonalData
  onChange: (data: PersonalData) => void
}

export function StepPersonal({ data, onChange }: Props) {
  const set = (field: keyof PersonalData, value: string) =>
    onChange({ ...data, [field]: value })

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Nombre</Label>
          <Input className="h-8 text-xs" value={data.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Apellido</Label>
          <Input className="h-8 text-xs" value={data.last_name} onChange={e => set('last_name', e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Email</Label>
        <Input className="h-8 text-xs" type="email" value={data.email} onChange={e => set('email', e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Teléfono</Label>
        <Input className="h-8 text-xs" value={data.phone_number} onChange={e => set('phone_number', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Fecha de nacimiento</Label>
          <Input className="h-8 text-xs" type="date" value={data.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Género</Label>
          <Select value={data.gender} onValueChange={v => set('gender', v ?? 'M')} items={[{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Femenino' }, { value: 'O', label: 'Otro' }]}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Masculino</SelectItem>
              <SelectItem value="F">Femenino</SelectItem>
              <SelectItem value="O">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
