import { TextareaHTMLAttributes } from 'react'

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
}

export function FormTextarea({ label, hint, className = '', ...props }: FormTextareaProps) {
  return (
    <div className="space-y-1.5">
      <label className="block font-mono text-[9px] tracking-[0.15em] uppercase text-text-light">
        {label}
        {props.required && <span className="text-accent ml-1">*</span>}
      </label>
      <textarea
        className={`w-full border border-border bg-bg text-text font-body text-sm px-4 py-2.5 rounded-[6px] focus:outline-none focus:border-bg-dark placeholder:text-text-light resize-none ${className}`}
        {...props}
      />
      {hint && <p className="font-mono text-[8px] tracking-[0.05em] text-text-light">{hint}</p>}
    </div>
  )
}
