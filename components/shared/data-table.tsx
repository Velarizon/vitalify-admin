// components/shared/data-table.tsx
'use client'

import {
  ColumnDef, flexRender, getCoreRowModel,
  getFilteredRowModel, getPaginationRowModel, useReactTable,
} from '@tanstack/react-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchPlaceholder?: string
  toolbar?: React.ReactNode
}

export function DataTable<TData, TValue>({
  columns, data, searchPlaceholder = 'Buscar...', toolbar,
}: DataTableProps<TData, TValue>) {
  const [globalFilter, setGlobalFilter] = useState('')
  const [pageSize, setPageSize] = useState(50)

  const table = useReactTable({
    data, columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  })

  const totalRows = table.getFilteredRowModel().rows.length
  const pageIndex = table.getState().pagination.pageIndex
  const currentPageSize = table.getState().pagination.pageSize
  const start = pageIndex * currentPageSize + 1
  const end = Math.min((pageIndex + 1) * currentPageSize, totalRows)

  return (
    <div className="space-y-4">
      {/* HUD Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-secondary/10 p-2 rounded-lg border border-white/5">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/50" />
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            className="h-9 w-64 text-xs pl-9 bg-background/50 border-border/40 focus:border-primary/30 transition-all"
          />
        </div>
        {toolbar}
      </div>

      <div className="rounded-xl overflow-hidden border border-white/5 bg-background/20 backdrop-blur-sm">
        <Table className="min-w-[600px]">
          <TableHeader className="bg-secondary/20">
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id} className="border-b border-white/5 hover:bg-transparent">
                {hg.headers.map(h => (
                  <TableHead key={h.id} className="h-10 text-[9px] uppercase tracking-[0.2em] font-black px-4 text-muted-foreground/70">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow 
                  key={row.id} 
                  className="group border-none hover:bg-primary/[0.03] transition-colors duration-200"
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="py-3 px-4 text-xs border-none">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-xs text-muted-foreground uppercase tracking-widest">
                  Sin registros detectados en la base.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* HUD Footer Pagination */}
      <div className="flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <span>
            {totalRows > 0 ? `Entradas ${start} a ${end} de ${totalRows}` : '0 Resultados'}
          </span>
          <div className="h-4 w-[1px] bg-border/40" />
          <div className="flex items-center gap-2">
            <span>Mostrar</span>
            <Select
              value={String(currentPageSize)}
              onValueChange={v => { setPageSize(Number(v)); table.setPageSize(Number(v)) }}
            >
              <SelectTrigger className="h-6 w-16 text-[9px] bg-transparent border-border/40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="25" className="text-[9px]">25</SelectItem>
                <SelectItem value="50" className="text-[9px]">50</SelectItem>
                <SelectItem value="100" className="text-[9px]">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-[9px] px-3 font-bold uppercase tracking-widest hover:bg-primary/10 transition-all"
            onClick={() => table.previousPage()} 
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-[9px] px-3 font-bold uppercase tracking-widest hover:bg-primary/10 transition-all"
            onClick={() => table.nextPage()} 
            disabled={!table.getCanNextPage()}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}
