import { SelectHTMLAttributes } from 'react'

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: string
  options: { value: string; label: string }[]
}

export function FormSelect({ label, hint, options, className = '', ...props }: FormSelectProps) {
  return (
    <div className="space-y-1.5">
      <label className="block font-mono text-[9px] tracking-[0.15em] uppercase text-text-light">
        {label}
        {props.required && <span className="text-accent ml-1">*</span>}
      </label>
      <select
        className={`w-full border border-border bg-bg text-text font-body text-sm px-4 py-2.5 rounded-[6px] focus:outline-none focus:border-bg-dark ${className}`}
        {...props}
      >
        <option value="">— Select —</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && <p className="font-mono text-[8px] tracking-[0.05em] text-text-light">{hint}</p>}
    </div>
  )
}
