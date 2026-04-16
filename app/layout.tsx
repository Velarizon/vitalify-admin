import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
})

export const metadata: Metadata = {
  title: 'Vitalify Admin',
  description: 'Panel de administración Vitalify',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${inter.className} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
          <TooltipProvider>
            {children}
          </TooltipProvider>
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
