const ROMAN = ['I', 'II', 'III', 'IV', 'V']

interface StepHeaderProps {
  step: number
  title: string
  description?: string
}

export function StepHeader({ step, title, description }: StepHeaderProps) {
  return (
    <div className="border-b-2 border-bg-dark pb-6 mb-8">
      <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-light mb-2">
        Step {ROMAN[step - 1] ?? step}
      </div>
      <h2 className="font-serif text-2xl font-bold text-text">{title}</h2>
      {description && <p className="font-body text-sm text-text-mid mt-1">{description}</p>}
    </div>
  )
}
