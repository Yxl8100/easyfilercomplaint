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
            File a Complaint
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="font-serif text-4xl font-bold text-text mt-4 mb-2">
            What type of complaint are you filing?
          </h1>
          <p className="font-body text-base text-text-mid">
            Select the category that best describes your complaint.
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
              </div>
              <h3 className="font-serif text-lg font-bold text-text mb-2">{cat.label}</h3>
              <p className="font-body text-sm text-text-mid leading-relaxed mb-4">{cat.description}</p>
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
