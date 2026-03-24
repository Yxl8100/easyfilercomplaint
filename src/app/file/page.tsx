import Link from 'next/link'
import { Masthead } from '@/components/Masthead'
import { Footer } from '@/components/Footer'
import { DoubleRule } from '@/components/DoubleRule'
import { categories } from '@/lib/categories'

export default function FilePage() {
  return (
    <div className="min-h-screen bg-cream">
      <Masthead />
      <div className="border-b border-rule bg-warm">
        <div className="max-w-6xl mx-auto px-6 py-1.5 flex items-center justify-between">
          <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-ink-faint">
            File a Complaint · Select Category
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-ink-faint mb-2">
            Step I of VI
          </p>
          <DoubleRule />
          <h1 className="font-serif text-4xl font-bold text-ink mt-4 mb-2">
            What Are You Filing About?
          </h1>
          <p className="font-body text-base text-ink-light">
            Select the category that best describes your complaint. We&apos;ll identify the relevant agencies and guide you through the process.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-rule">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/file/${cat.id}`}
              className="bg-cream p-6 hover:bg-paper transition-colors group block"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="font-serif text-4xl text-rule-dark group-hover:text-accent transition-colors">
                  {cat.icon}
                </span>
                <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-ink-faint border border-rule px-2 py-0.5">
                  {cat.agencies.length} {cat.agencies.length === 1 ? 'agency' : 'agencies'}
                </span>
              </div>
              <h3 className="font-serif text-lg font-bold text-ink mb-2">{cat.label}</h3>
              <p className="font-body text-sm text-ink-light leading-relaxed mb-4">{cat.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {cat.agencies.map((agency) => (
                  <span
                    key={agency.id}
                    className="font-mono text-[8px] tracking-[0.1em] uppercase bg-ink text-cream px-2 py-0.5"
                  >
                    {agency.name}
                  </span>
                ))}
              </div>
              <div className="mt-4 font-mono text-[9px] tracking-[0.1em] uppercase text-accent group-hover:text-ink transition-colors">
                Select →
              </div>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  )
}
