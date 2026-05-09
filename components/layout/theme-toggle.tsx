'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setMounted(true), 0)
    return () => window.clearTimeout(timeoutId)
  }, [])

  if (!mounted) {
    return (
      <button
        type="button"
        className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground opacity-50"
        aria-label="Tema"
        disabled
      >
        <Sun className="h-4 w-4" />
      </button>
    )
  }

  const isLight = theme === 'light'
  const Icon = isLight ? Moon : Sun
  const changeTheme = (nextTheme: 'light' | 'dark', trigger: HTMLElement) => {
    if (theme === nextTheme) return

    if (!document.startViewTransition) {
      setTheme(nextTheme)
      return
    }

    const rect = trigger.getBoundingClientRect()
    document.documentElement.style.setProperty('--theme-transition-x', `${rect.left + rect.width / 2}px`)
    document.documentElement.style.setProperty('--theme-transition-y', `${rect.top + rect.height / 2}px`)
    document.documentElement.dataset.themeTransition = nextTheme
    const transition = document.startViewTransition(() => setTheme(nextTheme))

    transition.ready.finally(() => {
      window.setTimeout(() => {
        delete document.documentElement.dataset.themeTransition
        document.documentElement.style.removeProperty('--theme-transition-x')
        document.documentElement.style.removeProperty('--theme-transition-y')
      }, 650)
    })
  }

  return (
    <button
      type="button"
      className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      aria-label={isLight ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro'}
      onClick={(event) => changeTheme(isLight ? 'dark' : 'light', event.currentTarget)}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}
