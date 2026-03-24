const ROMAN = ['I', 'II', 'III', 'IV', 'V']

interface StepHeaderProps {
  step: number
  title: string
  description?: string
}

export function StepHeader({ step, title, description }: StepHeaderProps) {
  return (
    <div className="border-b-[3px] border-double border-ink pb-6 mb-8">
      <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-ink-faint mb-2">
        Step {ROMAN[step - 1] ?? step}
      </div>
      <h2 className="font-serif text-2xl font-bold text-ink">{title}</h2>
      {description && <p className="font-body text-sm text-ink-light mt-1">{description}</p>}
    </div>
  )
}
