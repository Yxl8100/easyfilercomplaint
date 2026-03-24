import { InputHTMLAttributes } from 'react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

export function FormField({ label, hint, className = '', ...props }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block font-mono text-[9px] tracking-[0.15em] uppercase text-ink-faint">
        {label}
        {props.required && <span className="text-accent ml-1">*</span>}
      </label>
      <input
        className={`w-full border border-rule bg-cream text-ink font-body text-sm px-4 py-2.5 focus:outline-none focus:border-ink placeholder:text-ink-faint ${className}`}
        {...props}
      />
      {hint && <p className="font-mono text-[8px] tracking-[0.05em] text-ink-faint">{hint}</p>}
    </div>
  )
}
