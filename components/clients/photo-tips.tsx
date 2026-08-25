import { Lightbulb, ChevronDown } from 'lucide-react'

const TIPS = [
  'Pide al cliente que retire lentes de sol, gorra o cualquier elemento que cubra el rostro.',
  'Aparta el cabello de la cara: cejas, ojos y contorno deben verse completos.',
  'Rostro centrado en el encuadre, mirando de frente a la cámara.',
  'Distancia media a cerca: la cara debe ocupar buena parte del recuadro.',
  'Evita contraluz y sombras fuertes; busca luz pareja de frente.',
]

/**
 * Sugerencias para capturar una foto que el reconocimiento facial pueda procesar.
 * `<details>` nativo: colapsado ocupa una línea, sin estado ni JS.
 */
export function PhotoTips() {
  return (
    <details className="group @container rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
      <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        <Lightbulb className="h-3.5 w-3.5 shrink-0 text-primary" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
          Sugerencias para la foto
        </p>
        <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-primary transition-transform duration-200 group-open:rotate-180" />
      </summary>
      {/* Container query: 2 columnas cuando el widget es ancho (dialog de edición),
          1 sola en el sheet angosto del alta. */}
      <ul className="mt-2 grid gap-x-6 gap-y-1 @md:grid-cols-2">
        {TIPS.map((tip) => (
          <li key={tip} className="flex gap-2 text-[11px] leading-snug text-muted-foreground">
            <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-primary/60" />
            {tip}
          </li>
        ))}
      </ul>
    </details>
  )
}
