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
    <div className="flex items-center justify-between pt-8 mt-8 border-t border-border">
      {onBack ? (
        <button
          onClick={onBack}
          className="font-mono text-[11px] tracking-[0.1em] uppercase text-text-mid hover:text-text transition-colors"
        >
          ← Back
        </button>
      ) : (
        <div />
      )}
      <button
        onClick={onContinue}
        disabled={continueDisabled}
        className={`font-mono text-[11px] tracking-[0.1em] uppercase px-8 py-3 rounded-[6px] transition-colors ${
          continueDisabled
            ? 'bg-border text-text-light cursor-not-allowed'
            : isLast
            ? 'bg-accent text-white hover:bg-bg-dark'
            : 'bg-bg-dark text-white hover:bg-text-mid'
        }`}
      >
        {continueLabel}
      </button>
    </div>
  )
}
