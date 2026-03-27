import Link from 'next/link'
import { Masthead } from '@/components/Masthead'
import { Footer } from '@/components/Footer'
import { DoubleRule } from '@/components/DoubleRule'

const categories = [
  {
    symbol: '§',
    title: 'Data Privacy',
    description: 'Unauthorized data collection, sale of personal information, CCPA violations, data breach failures.',
    agencies: ['FTC', 'CA AG'],
  },
  {
    symbol: '¶',
    title: 'Consumer Protection',
    description: 'Deceptive practices, false advertising, billing fraud, subscription traps, warranty violations.',
    agencies: ['FTC', 'CFPB'],
  },
  {
    symbol: '†',
    title: 'FDA Violations',
    description: 'Unsafe food products, mislabeled supplements, counterfeit medications, undisclosed ingredients.',
    agencies: ['FDA'],
  },
  {
    symbol: '‡',
    title: 'Environmental',
    description: 'Pollution, hazardous waste dumping, Clean Air Act violations, Clean Water Act violations.',
    agencies: ['EPA'],
  },
  {
    symbol: '∞',
    title: 'City Code Violations',
    description: 'Zoning infractions, building code violations, unlicensed contractors, public nuisance.',
    agencies: ['CA AG'],
  },
  {
    symbol: '◊',
    title: 'Accessibility / ADA',
    description: 'Disability discrimination, inaccessible facilities, failure to provide accommodations.',
    agencies: ['DOJ/ADA'],
  },
]

const steps = [
  { numeral: 'I', title: 'Select Category', description: 'Choose from 6 complaint categories spanning federal and state agencies.' },
  { numeral: 'II', title: 'Answer Questions', description: 'A guided form collects the details each specific agency requires.' },
  { numeral: 'III', title: 'We Format & File', description: 'We generate agency-specific complaint documents and submit via email or fax.' },
  { numeral: 'IV', title: 'Track Everything', description: 'Your dashboard shows submission status, confirmation numbers, and next steps.' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg">
      <Masthead />

      {/* Hero */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 pt-10 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main story */}
            <div className="lg:col-span-2 lg:border-r lg:border-border lg:pr-8">
              <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-accent mb-3">
                Consumer Rights · Special Report
              </p>
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-text leading-tight mb-4">
                You Have the Right to File a Complaint.{' '}
                <em className="text-accent">We Make It Easy.</em>
              </h1>
              <DoubleRule />
              <p className="font-body text-lg text-text-mid leading-relaxed mb-6 mt-4">
                Seven government agencies accept consumer complaints. Most people never file because
                the process is buried in government websites, requires agency-specific knowledge, and
                demands hours of research. We solve all of that with one guided form.
              </p>
              <p className="font-body text-base text-text-mid leading-relaxed mb-8">
                Fill out your complaint once. We format it for every relevant agency — FCC, FTC,
                CFPB, FDA, EPA, DOJ — and submit via official email and fax channels where available.
                Your complaint enters the official record.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center justify-center font-mono text-[11px] tracking-[0.1em] uppercase bg-bg-dark text-white px-8 py-3 rounded-[6px] hover:bg-text-mid transition-colors"
                >
                  File a Complaint →
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center justify-center font-mono text-[11px] tracking-[0.1em] uppercase border border-bg-dark text-text px-8 py-3 rounded-[6px] hover:bg-bg-alt transition-colors"
                >
                  See How It Works
                </Link>
              </div>
            </div>

            {/* Sidebar stats */}
            <div className="lg:col-span-1">
              <div className="bg-bg-alt border border-border rounded-[6px] p-6">
                <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-light mb-4 pb-2 border-b border-border">
                  By The Numbers
                </p>
                <div className="space-y-4">
                  {[
                    { stat: '7', label: 'Government Agencies' },
                    { stat: '6', label: 'Complaint Categories' },
                    { stat: '$0.50', label: 'Per Filing' },
                    { stat: '$2', label: 'Annual Membership' },
                    { stat: '1', label: 'Form to Fill Out' },
                  ].map(({ stat, label }) => (
                    <div key={label} className="flex items-baseline justify-between border-b border-border pb-3">
                      <span className="font-serif text-2xl font-bold text-text">{stat}</span>
                      <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-text-light">{label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="font-mono text-[8px] tracking-[0.05em] uppercase text-text-light leading-relaxed">
                    Not a law firm. Filing assistance only. Results not guaranteed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-8">
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-light">Departments</span>
            <div className="flex-1 border-t border-border" />
          </div>

          <h2 className="font-serif text-3xl font-bold text-text mb-8">
            What Can You File?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div key={cat.title} className="bg-bg-alt border border-border rounded-[6px] p-6 hover:border-border-dark transition-colors group cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <span className="font-serif text-4xl text-border-dark group-hover:text-accent transition-colors">
                    {cat.symbol}
                  </span>
                  <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-text-light border border-border rounded-[4px] px-2 py-0.5">
                    $0.50
                  </span>
                </div>
                <h3 className="font-serif text-lg font-bold text-text mb-2">{cat.title}</h3>
                <p className="font-body text-sm text-text-mid leading-relaxed mb-4">{cat.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {cat.agencies.map((agency) => (
                    <span
                      key={agency}
                      className="font-mono text-[8px] tracking-[0.1em] uppercase bg-bg-dark text-white px-2 py-0.5 rounded-[4px]"
                    >
                      {agency}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-b border-border bg-bg-alt">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-8">
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-light">The Process</span>
            <div className="flex-1 border-t border-border" />
          </div>

          <h2 className="font-serif text-3xl font-bold text-text mb-10">
            Four Steps to an Official Filing
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((step) => (
              <div key={step.numeral} className="bg-bg border border-border rounded-[6px] p-6">
                <div className="font-serif text-5xl font-bold text-border-dark mb-4">{step.numeral}.</div>
                <h3 className="font-serif text-lg font-bold text-text mb-2">{step.title}</h3>
                <p className="font-body text-sm text-text-mid leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-8">
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-light">Rates</span>
            <div className="flex-1 border-t border-border" />
          </div>

          <div className="max-w-lg mx-auto">
            <div className="bg-bg border border-border rounded-[6px] p-8">
              <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-light text-center mb-2">
                Annual Membership
              </p>
              <DoubleRule />

              <div className="text-center py-6">
                <div className="flex items-end justify-center gap-1 mb-1">
                  <span className="font-serif text-6xl font-bold text-text">$2</span>
                  <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-text-light mb-3">per annum</span>
                </div>
                <p className="font-mono text-sm text-accent font-medium">+ $0.50 per filing</p>
              </div>

              <DoubleRule />

              <ul className="space-y-3 mb-8">
                {[
                  'Access to all 6 complaint categories',
                  'Auto-submission to relevant agencies',
                  'PDF complaint documents',
                  'Filing status dashboard',
                  'Confirmation tracking',
                  'Unlimited filings (pay per use)',
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="font-serif text-accent mt-0.5">§</span>
                    <span className="font-body text-sm text-text-mid">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/auth/signin"
                className="block w-full text-center font-mono text-[11px] tracking-[0.1em] uppercase bg-bg-dark text-white py-3 rounded-[6px] hover:bg-text-mid transition-colors"
              >
                Start Filing — $2/year →
              </Link>

              <p className="font-mono text-[8px] tracking-[0.05em] uppercase text-text-light text-center mt-4">
                Cancel anytime · No auto-renew · Pay per filing only
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
