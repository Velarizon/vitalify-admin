'use client'

import { useState, useEffect } from 'react'  
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import { ClientSearchParams } from '@/lib/supabase/browser-catalogs'

interface ClientSearchBarProps {
  onSearch: (params: ClientSearchParams) => void
  onClear: () => void
}

export function ClientSearchBar({ onSearch, onClear }: ClientSearchBarProps) {
  const [name, setName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')

  const hasValues = name || lastName || phone

  useEffect(() => {
    if (!name && !lastName && !phone) {
      onClear()
    }
  }, [name, lastName, phone])

  const handleSearch = () => {
    onSearch({
      name: name.trim() || undefined,
      lastName: lastName.trim() || undefined,
      phone: phone.trim() || undefined,
    })
  }

  const handleClear = () => {
    setName('')
    setLastName('')
    setPhone('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="flex items-center gap-2 flex-wrap bg-secondary/10 p-2 rounded-lg border border-white/5">
      <Input
        placeholder="Nombre..."
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        className="h-9 w-36 text-xs bg-background/50 border-border/40 focus:border-primary/30"
      />
      <Input
        placeholder="Apellido..."
        value={lastName}
        onChange={e => setLastName(e.target.value)}
        onKeyDown={handleKeyDown}
        className="h-9 w-36 text-xs bg-background/50 border-border/40 focus:border-primary/30"
      />
      <Input
        placeholder="Teléfono..."
        value={phone}
        onChange={e => setPhone(e.target.value)}
        onKeyDown={handleKeyDown}
        className="h-9 w-36 text-xs bg-background/50 border-border/40 focus:border-primary/30"
      />
      <Button
        size="sm"
        onClick={handleSearch}
        className="h-9 px-4 text-[10px] uppercase font-black tracking-widest gap-2 bg-primary text-black hover:bg-primary/90"
      >
        <Search className="h-3 w-3 stroke-[3px]" /> Buscar
      </Button>
      {hasValues && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleClear}
          className="h-9 px-3 text-[10px] uppercase font-black tracking-widest gap-1.5 border-white/5 hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-3 w-3" /> Limpiar
        </Button>
      )}
    </div>
  )
}