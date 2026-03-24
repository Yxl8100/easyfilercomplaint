interface StepNavigationProps {
  onBack?: () => void
  onContinue?: () => void
  continueLabel?: string
  continueDisabled?: boolean
  isLast?: boolean
}

export function StepNavigation({
  onBack,
  onContinue,
  continueLabel = 'Continue →',
  continueDisabled = false,
  isLast = false,
}: StepNavigationProps) {
  return (
    <div className="flex items-center justify-between pt-8 mt-8 border-t border-rule">
      {onBack ? (
        <button
          onClick={onBack}
          className="font-mono text-[11px] tracking-[0.1em] uppercase text-ink-light hover:text-ink transition-colors"
        >
          ← Back
        </button>
      ) : (
        <div />
      )}
      <button
        onClick={onContinue}
        disabled={continueDisabled}
        className={`font-mono text-[11px] tracking-[0.1em] uppercase px-8 py-3 transition-colors ${
          continueDisabled
            ? 'bg-rule text-ink-faint cursor-not-allowed'
            : isLast
            ? 'bg-accent text-cream hover:bg-ink'
            : 'bg-ink text-cream hover:bg-ink-light'
        }`}
      >
        {continueLabel}
      </button>
    </div>
  )
}
