import { InputHTMLAttributes } from 'react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

export function FormField({ label, hint, className = '', ...props }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block font-mono text-[9px] tracking-[0.15em] uppercase text-text-light">
        {label}
        {props.required && <span className="text-accent ml-1">*</span>}
      </label>
      <input
        className={`w-full border border-border bg-bg text-text font-body text-sm px-4 py-2.5 rounded-[6px] focus:outline-none focus:border-bg-dark placeholder:text-text-light ${className}`}
        {...props}
      />
      {hint && <p className="font-mono text-[8px] tracking-[0.05em] text-text-light">{hint}</p>}
    </div>
  )
}
