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
    <Card className={cn('glass-panel ring-0 overflow-hidden group transition-all duration-300 hover:scale-[1.02]', className)}>
      <CardContent className="p-4 relative">
        <div className="space-y-1">
          <p className="text-technical text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
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
        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
      </CardContent>
    </Card>
  )
}
