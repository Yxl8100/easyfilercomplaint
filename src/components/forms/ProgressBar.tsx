const STEPS = ['Category', 'Agencies', 'Business', 'Incident', 'Your Info', 'Review']

interface ProgressBarProps {
  currentStep: number
}

export function ProgressBar({ currentStep }: ProgressBarProps) {
  return (
    <div className="border-b border-rule bg-warm">
      <div className="max-w-3xl mx-auto px-6 py-3">
        <div className="flex items-center gap-0">
          {STEPS.map((label, index) => {
            const stepNum = index
            const isActive = stepNum === currentStep
            const isDone = stepNum < currentStep
            return (
              <div key={label} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-5 h-5 flex items-center justify-center font-mono text-[8px] border transition-colors ${
                      isDone
                        ? 'bg-ink border-ink text-cream'
                        : isActive
                        ? 'bg-cream border-ink text-ink'
                        : 'bg-cream border-rule text-ink-faint'
                    }`}
                  >
                    {isDone ? '✓' : index + 1}
                  </div>
                  <span
                    className={`font-mono text-[7px] tracking-[0.05em] uppercase mt-1 ${
                      isActive ? 'text-ink' : isDone ? 'text-ink-light' : 'text-ink-faint'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`h-px flex-1 mb-3 ${isDone ? 'bg-ink' : 'bg-rule'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
