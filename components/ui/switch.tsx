"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type SwitchProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      className,
      checked,
      defaultChecked = false,
      disabled,
      onCheckedChange,
      type = "button",
      ...props
    },
    ref
  ) => {
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked)
    const isControlled = checked !== undefined
    const isChecked = isControlled ? checked : internalChecked

    const handleToggle = () => {
      if (disabled) return
      const next = !isChecked
      if (!isControlled) {
        setInternalChecked(next)
      }
      onCheckedChange?.(next)
    }

    return (
      <button
        ref={ref}
        type={type}
        role="switch"
        aria-checked={isChecked}
        data-checked={isChecked}
        data-slot="switch"
        disabled={disabled}
        className={cn(
          "peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent bg-muted px-0.5 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[checked=true]:bg-primary",
          className
        )}
        onClick={handleToggle}
        {...props}
      >
        <span
          className={cn(
            "block size-5 rounded-full bg-background shadow-sm transition-transform",
            isChecked && "translate-x-5 bg-primary-foreground"
          )}
        />
        <span className="sr-only">{isChecked ? "Activo" : "Inactivo"}</span>
      </button>
    )
  }
)

Switch.displayName = "Switch"

export { Switch }
