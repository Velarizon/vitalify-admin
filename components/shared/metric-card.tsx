// components/shared/metric-card.tsx
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  className?: string
  trend?: {
    value: number
    label: string
    isPositive?: boolean
  }
}

export function MetricCard({ title, value, subtitle, className, trend }: MetricCardProps) {
  return (
    <Card className={cn('neon-card overflow-hidden group hover:border-primary/30 transition-all duration-300', className)}>
      <CardContent className="p-4 relative">
        <div className="space-y-1">
          <p className="text-hud tracking-widest">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-heading font-bold text-foreground group-hover:text-primary transition-colors">
              {value}
            </p>
            {trend && (
              <span className={cn(
                'text-[10px] font-medium px-1.5 py-0.5 rounded-sm',
                trend.isPositive ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
              )}>
                {trend.isPositive ? '+' : '-'}{trend.value}%
              </span>
            )}
          </div>
          {(subtitle || trend?.label) && (
            <p className="text-[10px] text-muted-foreground/70">
              {subtitle || trend?.label}
            </p>
          )}
        </div>
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none overflow-hidden opacity-20 group-hover:opacity-40 transition-opacity">
          <div className="absolute top-0 right-0 w-[2px] h-3 bg-primary" />
          <div className="absolute top-0 right-0 w-3 h-[2px] bg-primary" />
        </div>
      </CardContent>
    </Card>
  )
}
