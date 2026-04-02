import Link from 'next/link'

export function Masthead() {
  return (
    <header className="sticky top-0 z-50 bg-bg border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="group">
          <span className="font-serif text-xl font-bold text-text tracking-tight">
            EasyFiler<span className="text-accent">Complaint</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/#how-it-works" className="font-mono text-[11px] tracking-[0.1em] uppercase text-text-mid hover:text-text transition-colors">
            How It Works
          </Link>
          <Link href="/#pricing" className="font-mono text-[11px] tracking-[0.1em] uppercase text-text-mid hover:text-text transition-colors">
            Pricing
          </Link>
          <Link
            href="/login"
            className="font-mono text-[11px] tracking-[0.1em] uppercase border border-bg-dark px-4 py-1.5 text-text rounded-[6px] hover:bg-bg-dark hover:text-white transition-colors"
          >
            Sign In
          </Link>
        </nav>
      </div>
    </header>
  )
}
