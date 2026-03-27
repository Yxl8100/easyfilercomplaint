interface Option {
  value: string
  label: string
}

interface FormCheckboxGroupProps {
  label: string
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  hint?: string
}

export function FormCheckboxGroup({ label, options, selected, onChange, hint }: FormCheckboxGroupProps) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <div className="space-y-2">
      <label className="block font-mono text-[9px] tracking-[0.15em] uppercase text-text-light">{label}</label>
      <div className="space-y-2">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => toggle(opt.value)}
              className="w-4 h-4 border border-border bg-bg accent-text"
            />
            <span className="font-body text-sm text-text group-hover:text-text-mid">{opt.label}</span>
          </label>
        ))}
      </div>
      {hint && <p className="font-mono text-[8px] tracking-[0.05em] text-text-light">{hint}</p>}
    </div>
  )
}
