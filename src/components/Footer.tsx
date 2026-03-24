import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-ink text-cream">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="border-b border-cream/20 pb-8 mb-8">
          <div className="flex flex-col">
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-cream/40">The</span>
            <span className="font-serif text-2xl font-bold text-cream tracking-tight">
              EasyFiler<em>Complaint</em>
            </span>
            <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-cream/40 mt-1">
              Est. 2026 · Consumer Advocacy
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-mono text-[9px] tracking-[0.2em] uppercase text-cream/40 mb-4">Platform</h3>
            <ul className="space-y-2">
              {['File a Complaint', 'How It Works', 'Pricing', 'Dashboard'].map((item) => (
                <li key={item}>
                  <Link href="#" className="font-body text-sm text-cream/70 hover:text-cream transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-mono text-[9px] tracking-[0.2em] uppercase text-cream/40 mb-4">Legal</h3>
            <ul className="space-y-2">
              {['Privacy Policy', 'Terms of Service', 'Refund Policy'].map((item) => (
                <li key={item}>
                  <Link href="#" className="font-body text-sm text-cream/70 hover:text-cream transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-mono text-[9px] tracking-[0.2em] uppercase text-cream/40 mb-4">Agencies</h3>
            <ul className="space-y-2">
              {['FCC', 'FTC', 'CFPB', 'FDA', 'EPA', 'DOJ/ADA'].map((item) => (
                <li key={item}>
                  <span className="font-mono text-xs text-cream/50">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-cream/20 pt-6">
          <p className="font-mono text-[10px] tracking-[0.05em] text-cream/30 text-center">
            © 2026 EasyFilerComplaint. Not a law firm. Filing assistance only.
          </p>
        </div>
      </div>
    </footer>
  )
}
