import Link from 'next/link'

export function Masthead() {
  return (
    <header className="sticky top-0 z-50 bg-cream border-b-[3px] border-double border-ink">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="group">
          <div className="flex flex-col leading-none">
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-ink-faint">The</span>
            <span className="font-serif text-xl font-bold text-ink tracking-tight">
              EasyFiler<em>Complaint</em>
            </span>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/#how-it-works" className="font-mono text-[11px] tracking-[0.1em] uppercase text-ink-light hover:text-ink transition-colors">
            How It Works
          </Link>
          <Link href="/#pricing" className="font-mono text-[11px] tracking-[0.1em] uppercase text-ink-light hover:text-ink transition-colors">
            Pricing
          </Link>
          <Link
            href="/auth/signin"
            className="font-mono text-[11px] tracking-[0.1em] uppercase border border-ink px-4 py-1.5 text-ink hover:bg-ink hover:text-cream transition-colors"
          >
            Sign In
          </Link>
        </nav>
      </div>
    </header>
  )
}
