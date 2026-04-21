// components/clients/wizard-stepper.tsx
'use client'

import { cn } from '@/lib/utils'

interface WizardStepperProps {
  steps: string[]
  currentStep: number
}

export function WizardStepper({ steps, currentStep }: WizardStepperProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
            i < currentStep && 'bg-primary border-primary text-primary-foreground',
            i === currentStep && 'border-primary text-primary',
            i > currentStep && 'border-border text-muted-foreground',
          )}>
            {i + 1}
          </div>
          {i === currentStep && (
            <span className="text-xs font-medium text-foreground whitespace-nowrap">
              {label}
            </span>
          )}
          {i < steps.length - 1 && (
            <div className={cn(
              'w-8 h-px',
              i < currentStep ? 'bg-primary' : 'bg-border'
            )} />
          )}
        </div>
      ))}
    </div>
  )
}
