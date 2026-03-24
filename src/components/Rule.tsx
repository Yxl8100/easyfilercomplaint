export function Rule({ className = '' }: { className?: string }) {
  return <div className={`border-t border-rule my-3 ${className}`} />
}
