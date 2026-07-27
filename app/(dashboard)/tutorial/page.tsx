// app/(dashboard)/tutorial/page.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BookOpen, Smartphone, CreditCard,
  MessageCircle, Download, Key, Sparkles,
  CheckCircle2, ArrowRight, Info, HelpCircle,
  Copy, Check, Send, Users, UserPlus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const Instagram = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
)

export default function TutorialPage() {
  const [activeStep, setActiveStep] = useState<number>(0)
  const [copiedInstagram, setCopiedInstagram] = useState(false)
  const [copiedMessage, setCopiedMessage] = useState(false)

  const steps = [
    {
      title: 'Interés y Oferta',
      role: 'staff',
      icon: Instagram,
      shortDesc: 'Ofrecer la app y promover Instagram.',
      badgeText: 'Paso 1: Promoción',
      color: 'from-primary/20 to-emerald-500/10 border-primary/30 text-primary',
      badgeColor: 'bg-primary/10 text-primary border-primary/20',
      glow: 'shadow-neon',
      details: (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Cuando un cliente pregunte por su rutina, reserva de clases o pagos, es el momento ideal para ofrecer la app <strong className="text-foreground font-semibold">Vitalify</strong> como el complemento perfecto para potenciar su experiencia.
          </p>
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Acciones clave:</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Menciona los beneficios: rutinas digitales, reserva de clases, control de accesos y avisos.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Explica el costo: El complemento de la app tiene un valor de <strong className="text-foreground font-semibold">$99.00 MXN</strong> adicionales a su plan.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground font-semibold">Instagram obligatorio:</strong> Pide al cliente que siga la cuenta oficial de Instagram <span className="text-primary font-mono font-bold">@vitalifyapp</span> para actualizaciones, tutoriales de uso de la app y dinámicas del gym.
                </span>
              </li>
            </ul>
          </div>
          <div className="mt-4 p-3 rounded-lg border border-primary/20 bg-primary/5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Instagram className="h-8 w-8 text-primary shrink-0" />
              <div>
                <p className="text-xs font-bold text-foreground">Instagram Oficial</p>
                <p className="text-[10px] text-muted-foreground">Cuenta: @vitalifyapp</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                window.open('https://instagram.com/vitalifyapp', '_blank')
              }}
              className="text-[10px] uppercase font-bold tracking-widest border-primary/30 hover:bg-primary/10 text-primary shrink-0"
            >
              Ir a Instagram
            </Button>
          </div>
        </div>
      )
    },
    {
      title: 'Cobro y Activación',
      role: 'staff',
      icon: CreditCard,
      shortDesc: 'Registrar cobro y alta en el panel.',
      badgeText: 'Paso 2: Sistema',
      color: 'from-emerald-500/20 to-teal-500/20 border-primary/30 text-primary',
      badgeColor: 'bg-primary/10 text-primary border-primary/20',
      glow: 'shadow-[0_0_20px_rgba(19,236,164,0.15)]',
      details: (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Existen tres flujos diferentes en el panel administrativo donde puedes realizar el cobro y dar de alta al miembro en la aplicación móvil:
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="p-3 rounded-lg border border-border/40 bg-secondary/10">
              <div className="flex items-center gap-2 mb-1.5">
                <UserPlus className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground">1. Nuevo Cliente</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Al registrar un miembro desde cero, en el paso de "Plan y Pago", selecciona la opción de <strong>"Acceso a la app móvil (+ $99)"</strong>.
              </p>
            </div>
            <div className="p-3 rounded-lg border border-border/40 bg-secondary/10">
              <div className="flex items-center gap-2 mb-1.5">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground">2. Renovación</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Al renovar el plan de un cliente existente, marca la casilla del complemento de la app en la ventana de renovación.
              </p>
            </div>
            <div className="p-3 rounded-lg border border-border/40 bg-secondary/10">
              <div className="flex items-center gap-2 mb-1.5">
                <Smartphone className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground">3. Activación Directa</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                En el listado de clientes, busca al usuario y haz clic en el icono del celular (<span className="text-primary">App</span>) para cobrar y activar la app al instante.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 flex gap-2">
            <Info className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground">
              <strong className="text-yellow-500/90">Cuadre de Turno:</strong> Asegúrate de seleccionar el método de pago correcto (Efectivo, Tarjeta o Transferencia) en el formulario para que el cobro quede registrado en tu turno y no existan descuadres de caja.
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Compartir Acceso',
      role: 'staff',
      icon: MessageCircle,
      shortDesc: 'Entregar código de acceso temporal.',
      badgeText: 'Paso 3: Entrega',
      color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      glow: 'shadow-[0_0_20px_rgba(59,130,246,0.15)]',
      details: (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Al procesar la activación, el sistema mostrará una ventana emergente con el código temporal de acceso. Este código vincula al cliente con el gimnasio.
          </p>
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Métodos de envío:</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/40 bg-secondary/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded bg-primary/10 text-primary">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Enviar por WhatsApp (Recomendado)</p>
                    <p className="text-[10px] text-muted-foreground">Abre una pestaña de WhatsApp Web con un mensaje y código pre-redactados.</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/40 bg-secondary/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded bg-blue-500/10 text-blue-400">
                    <Copy className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Copiar y Pegar</p>
                    <p className="text-[10px] text-muted-foreground">Copia el código directamente al portapapeles para enviarlo por cualquier otro medio.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Mensaje que recibirá el cliente:</p>
            <div className="relative p-2.5 rounded bg-black/40 border border-white/5 font-mono text-[11px] text-muted-foreground whitespace-pre-line">
              {`Hola {Nombre}, te comparto tu código de acceso para la app Vitalify:

*VT99X2*

Al activar tu cuenta ingresa tu email ({Email}) y este código.`}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText("Hola, te comparto tu código de acceso para la app Vitalify:\n\n*VT99X2*\n\nAl activar tu cuenta ingresa tu email y este código.")
                  setCopiedMessage(true)
                  toast.success("Mensaje copiado al portapapeles")
                  setTimeout(() => setCopiedMessage(false), 2000)
                }}
                className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                {copiedMessage ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Descarga y Registro',
      role: 'customer',
      icon: Download,
      shortDesc: 'Cliente descarga la app y activa.',
      badgeText: 'Paso 4: Cliente',
      color: 'from-purple-500/20 to-fuchsia-500/20 border-purple-500/30 text-purple-400',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      glow: 'shadow-[0_0_20px_rgba(168,85,247,0.15)]',
      details: (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            El paso final corresponde al cliente. Guíalo brevemente sobre cómo realizar la instalación y su primer inicio de sesión:
          </p>
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Proceso para el cliente:</h4>
            <div className="relative border-l-2 border-primary/30 pl-4 space-y-4 py-1">
              <div className="relative">
                <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
                <p className="text-xs font-bold text-foreground">Descargar la App</p>
                <p className="text-[11px] text-muted-foreground">Buscar <strong className="text-foreground font-semibold">"Vitalify"</strong> en la Google Play Store (Android) o App Store (iOS) e instalarla.</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
                <p className="text-xs font-bold text-foreground">Registrarse / Activar Cuenta</p>
                <p className="text-[11px] text-muted-foreground">Abrir la app, pulsar en "Registrar" e ingresar el correo electrónico exacto que proporcionó en recepción.</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
                <p className="text-xs font-bold text-foreground">Ingresar Código de Acceso</p>
                <p className="text-[11px] text-muted-foreground">Colocar el código de acceso de 6 caracteres que le enviaste por WhatsApp.</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
                <p className="text-xs font-bold text-foreground">Crear Contraseña</p>
                <p className="text-[11px] text-muted-foreground">El cliente establecerá su contraseña personal. Desde ese momento, iniciará sesión con su correo y esa contraseña.</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border/40 bg-secondary/15 p-3 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              Una vez completada la activación, verás una insignia verde de <strong className="text-primary font-bold">App</strong> al lado del nombre del cliente en el módulo de <strong className="text-foreground">Clientes</strong>.
            </p>
          </div>
        </div>
      )
    }
  ]

  const handleCopyInstagram = () => {
    navigator.clipboard.writeText('vitalifyapp')
    setCopiedInstagram(true)
    toast.success('Nombre de Instagram copiado: vitalifyapp')
    setTimeout(() => setCopiedInstagram(false), 1500)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary animate-pulse" />
            <h1 className="text-2xl font-heading font-black uppercase italic tracking-tighter text-foreground">
              Guía de Activación de App
            </h1>
          </div>
          <p className="text-technical tracking-[0.3em]">
            Flujo de Trabajo para Recepción y Staff
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider font-black text-muted-foreground bg-white/5 px-2.5 py-1 rounded">
            Complemento App Móvil
          </span>
          <span className="text-[10px] uppercase tracking-wider font-black text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded">
            Costo: $99 MXN
          </span>
        </div>
      </div>

      {/* Instagram Spotlight Card */}
      <div className="glass-panel relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-transparent p-5 sm:p-6 shadow-[0_0_30px_rgba(19,236,164,0.05)]">
        <div className="absolute top-0 right-0 h-40 w-40 bg-primary/10 rounded-full filter blur-[50px] pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(19,236,164,0.15)]">
              <Instagram className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-primary">Requisito de Comunidad</span>
              <h2 className="text-base font-bold text-foreground">Promover el Instagram oficial de Vitalify</h2>
              <p className="text-xs text-muted-foreground leading-normal max-w-xl">
                Es fundamental pedirle a cada cliente interesado que siga la cuenta <strong className="text-foreground font-semibold">@vitalifyapp</strong>. Ahí compartimos tips de entrenamiento, noticias del gimnasio y aclaramos dudas rápidas.
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyInstagram}
              className="flex-1 sm:flex-none text-xs h-9 gap-1.5 uppercase font-bold tracking-widest border-primary/30 text-primary hover:bg-primary/10"
            >
              {copiedInstagram ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedInstagram ? 'Copiado' : 'Copiar @'}
            </Button>
            <Button
              size="sm"
              onClick={() => window.open('https://instagram.com/vitalifyapp', '_blank')}
              className="flex-1 sm:flex-none text-xs h-9 gap-1.5 uppercase font-bold tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 shadow-neon border-none"
            >
              <Instagram className="h-3.5 w-3.5" />
              Seguir Cuenta
            </Button>
          </div>
        </div>
      </div>

      {/* Visual Roadmap / Stepper */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
            Línea de Tiempo del Proceso
          </h3>
          <span className="text-[10px] text-muted-foreground uppercase font-semibold">
            Haz clic en un paso para ver los detalles
          </span>
        </div>

        {/* Stepper component */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {steps.map((step, idx) => {
            const Icon = step.icon
            const isSelected = activeStep === idx
            return (
              <button
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={cn(
                  'flex flex-col items-start text-left p-4 rounded-xl border transition-all duration-300 relative group cursor-pointer overflow-hidden',
                  isSelected
                    ? `bg-gradient-to-br ${step.color} border-border ${step.glow}`
                    : 'border-border/40 bg-card hover:border-border/80 hover:bg-secondary/10'
                )}
              >
                {/* Micro indicator top right */}
                <span className={cn(
                  'absolute top-3 right-3 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-sm font-black border',
                  step.role === 'staff' 
                    ? 'bg-primary/10 text-primary border-primary/20' 
                    : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                )}>
                  {step.role === 'staff' ? 'Staff' : 'Cliente'}
                </span>

                <div className="flex items-center justify-between w-full mb-3">
                  <div className={cn(
                    'p-2 rounded-lg border transition-colors',
                    isSelected ? 'bg-background/80 border-white/10' : 'bg-secondary/30 border-border/40 group-hover:border-border'
                  )}>
                    <Icon className={cn('h-4 w-4', isSelected ? step.color.split(' ').pop() : 'text-muted-foreground')} />
                  </div>
                  <span className="text-2xl font-black font-mono text-muted-foreground/15 italic">
                    0{idx + 1}
                  </span>
                </div>
                
                <h4 className="text-xs font-black uppercase tracking-widest text-foreground truncate w-full">
                  {step.title}
                </h4>
                <p className="mt-1 text-[11px] text-muted-foreground leading-snug line-clamp-2">
                  {step.shortDesc}
                </p>
                
                {/* Horizontal active bar */}
                {isSelected && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-transparent" />
                )}
              </button>
            )
          })}
        </div>

        {/* Selected Step Details Box */}
        <div className="glass-panel rounded-xl p-6 relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Badge className={cn('border text-[9px] uppercase tracking-widest px-2.5 py-0.5 font-bold', steps[activeStep].badgeColor)}>
                {steps[activeStep].badgeText}
              </Badge>
              <h3 className="text-base font-bold text-foreground">
                {steps[activeStep].title}
              </h3>
            </div>
            <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
              Responsable: <span className={cn('font-bold', steps[activeStep].role === 'staff' ? 'text-primary' : 'text-purple-400')}>
                {steps[activeStep].role === 'staff' ? 'Recepcionista (Staff)' : 'Cliente'}
              </span>
            </div>
          </div>

          {steps[activeStep].details}
          
          <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-white/5">
            <Button
              variant="ghost"
              size="sm"
              disabled={activeStep === 0}
              onClick={() => setActiveStep(prev => prev - 1)}
              className="text-[10px] uppercase font-bold tracking-widest"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={activeStep === steps.length - 1}
              onClick={() => setActiveStep(prev => prev + 1)}
              className="text-[10px] uppercase font-bold tracking-widest border-border/40 gap-1.5"
            >
              Siguiente <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* WhatsApp Message Template Previewer */}
      <Card className="glass-panel border-border/40 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Plantilla de Mensaje WhatsApp</CardTitle>
              <CardDescription className="text-xs">
                Mensaje que se genera automáticamente al presionar "Enviar por WhatsApp" en el panel.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/15 max-w-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Previsualización de Chat</span>
              <span className="text-[9px] text-muted-foreground font-mono">19:30 PM · Enviado</span>
            </div>
            <div className="p-3 rounded-lg bg-[#075e54]/30 border border-[#075e54]/40 text-xs text-foreground/90 leading-relaxed font-sans whitespace-pre-line relative">
              <p>Hola <strong className="text-primary font-bold">Carlos Mendoza</strong>, te comparto tu código de acceso para la app Vitalify:</p>
              <p className="mt-2 text-center text-base font-mono font-black tracking-widest text-primary bg-black/40 py-1.5 rounded border border-white/5 my-2">
                Z9XW21
              </p>
              <p>Al activar tu cuenta ingresa tu email (carlos@gmail.com) y este código.</p>
              
              <div className="absolute right-2 bottom-1 flex items-center gap-0.5 text-[8px] text-muted-foreground/60">
                <span>✓✓</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground leading-normal italic">
              *Nota: El enlace de WhatsApp abre la aplicación oficial de WhatsApp con el número del cliente y el mensaje listo para enviar.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Frequently Asked Questions */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground">
            Preguntas Frecuentes & Soporte
          </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-4 rounded-xl border border-border/40 bg-card/50 space-y-2">
            <h4 className="text-xs font-bold text-foreground">¿Qué pasa si el cliente ya tenía cuenta en Vitalify?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              El sistema detectará que el correo ya está registrado en la base de datos de Vitalify. En ese caso, la ventana emergente indicará que no requiere código temporal. El usuario solo debe iniciar sesión con su contraseña habitual y se vinculará de inmediato al gimnasio actual.
            </p>
          </div>
          
          <div className="p-4 rounded-xl border border-border/40 bg-card/50 space-y-2">
            <h4 className="text-xs font-bold text-foreground">¿El cliente no recibe el código o no tiene WhatsApp?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Puedes copiar manualmente el código temporal usando el botón <strong className="text-foreground font-semibold">"Copiar"</strong> en la ventana de confirmación. Compártelo con el cliente escribiéndoselo en un papel, dictándoselo o enviándolo por correo electrónico.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border/40 bg-card/50 space-y-2">
            <h4 className="text-xs font-bold text-foreground">¿Qué hacer si un cobro de app no aparece en el turno?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Todo cobro del complemento de la app ($99 MXN) se registra como un <strong>"Addon Payment"</strong>. Asegúrate de revisar tu sección de pagos del turno. Si no aparece, verifica que seleccionaste Efectivo/Tarjeta y confirmaste el flujo correctamente.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border/40 bg-card/50 space-y-2">
            <h4 className="text-xs font-bold text-foreground">¿Cómo validar si un miembro ya está activo en la app?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              En la lista de clientes de la administración, los usuarios activos tendrán una insignia verde de <strong className="text-primary font-bold">App</strong> al lado de su nombre. Si no la tiene, significa que el complemento no ha sido pagado o activado.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
