import Link from 'next/link'

const platformLinks = [
  { label: 'File a Complaint', href: '/file' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Dashboard', href: '/account/filings' },
]

const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'About', href: '/about' },
]

export function Footer() {
  return (
    <footer className="bg-bg-dark text-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="border-b border-white/20 pb-8 mb-8">
          <div className="flex flex-col">
            <span className="font-serif text-2xl font-bold text-white tracking-tight">
              EasyFiler<span className="text-accent">Complaint</span>
            </span>
            <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-white/40 mt-1">
              Est. 2026 · Consumer Advocacy
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/40 mb-4">Platform</h3>
            <ul className="space-y-2">
              {platformLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="font-body text-sm text-white/70 hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/40 mb-4">Legal</h3>
            <ul className="space-y-2">
              {legalLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="font-body text-sm text-white/70 hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/40 mb-4">Agencies</h3>
            <ul className="space-y-2">
              {['CA Attorney General'].map((item) => (
                <li key={item}>
                  <span className="font-mono text-xs text-white/50">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/20 pt-6">
          <p className="font-mono text-[10px] tracking-[0.05em] text-white/30 text-center">
            © 2026 EasyFilerComplaint. Not a law firm. Filing assistance only.
          </p>
        </div>
      </div>
    </footer>
  )
}
