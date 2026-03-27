import Link from 'next/link'
import { Masthead } from '@/components/Masthead'
import { Footer } from '@/components/Footer'
import { categories } from '@/lib/categories'

export default function FilePage() {
  return (
    <div className="min-h-screen bg-bg">
      <Masthead />
      <div className="border-b border-border bg-bg-alt">
        <div className="max-w-6xl mx-auto px-6 py-1.5 flex items-center justify-between">
          <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-text-light">
            File a Complaint · Select Category
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-light mb-2">
            Step I of VI
          </p>
          <div className="border-t-2 border-bg-dark my-4" />
          <h1 className="font-serif text-4xl font-bold text-text mt-4 mb-2">
            What Are You Filing About?
          </h1>
          <p className="font-body text-base text-text-mid">
            Select the category that best describes your complaint. We&apos;ll identify the relevant agencies and guide you through the process.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/file/${cat.id}`}
              className="bg-bg-alt border border-border rounded-[6px] p-6 hover:border-border-dark transition-colors group block"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="font-serif text-4xl text-border-dark group-hover:text-accent transition-colors">
                  {cat.icon}
                </span>
                <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-text-light border border-border rounded-[4px] px-2 py-0.5">
                  {cat.agencies.length} {cat.agencies.length === 1 ? 'agency' : 'agencies'}
                </span>
              </div>
              <h3 className="font-serif text-lg font-bold text-text mb-2">{cat.label}</h3>
              <p className="font-body text-sm text-text-mid leading-relaxed mb-4">{cat.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {cat.agencies.map((agency) => (
                  <span
                    key={agency.id}
                    className="font-mono text-[8px] tracking-[0.1em] uppercase bg-bg-dark text-white px-2 py-0.5 rounded-[4px]"
                  >
                    {agency.name}
                  </span>
                ))}
              </div>
              <div className="mt-4 font-mono text-[9px] tracking-[0.1em] uppercase text-accent group-hover:text-text transition-colors">
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
