import Link from 'next/link'
import { Masthead } from '@/components/Masthead'
import { Footer } from '@/components/Footer'
import { DoubleRule } from '@/components/DoubleRule'
import { HomeFaq } from '@/components/HomeFaq'

const complaintTypes = [
  {
    symbol: '§',
    title: 'Privacy Tracking Violations',
    description: 'Unauthorized data collection, sale of personal information, CCPA violations, failure to honor opt-out requests.',
    agency: 'CA Attorney General',
  },
  {
    symbol: '¶',
    title: 'Website Accessibility Barriers',
    description: 'Websites or apps that are inaccessible to people with disabilities, violating accessibility requirements.',
    agency: 'CA Attorney General',
  },
  {
    symbol: '†',
    title: 'Video Sharing Privacy',
    description: 'Unauthorized sharing or distribution of personal videos, violation of video privacy protections.',
    agency: 'CA Attorney General',
  },
]

const steps = [
  { numeral: 'I', title: 'Describe the Problem', description: 'Tell us what happened — the business name, what privacy violation occurred, and your contact details.' },
  { numeral: 'II', title: 'We Generate & File', description: 'We create a formal complaint letter and fax it directly to the California Attorney General\'s office.' },
  { numeral: 'III', title: 'Get Your Receipt', description: 'You receive a confirmation email with your complaint PDF and a unique filing receipt ID.' },
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
                Privacy Rights · Filing Service
              </p>
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-text leading-tight mb-4">
                File a Privacy Complaint{' '}
                <em className="text-accent">in 5 Minutes</em>
              </h1>
              <DoubleRule />
              <p className="font-body text-lg text-text-mid leading-relaxed mb-6 mt-4">
                California businesses are required to respect your privacy rights under the CCPA. When they
                don&apos;t, you have the right to file a formal complaint with the California Attorney General.
                EasyFilerComplaint handles the paperwork.
              </p>
              <p className="font-body text-base text-text-mid leading-relaxed mb-8">
                Tell us what happened. We generate a formal complaint letter, fax it directly to the CA
                Attorney General&apos;s office, and email you a copy with your unique filing receipt ID. The
                whole process takes about 5 minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/file"
                  className="inline-flex items-center justify-center font-mono text-[11px] tracking-[0.1em] uppercase bg-bg-dark text-white px-8 py-3 rounded-[6px] hover:bg-text-mid transition-colors"
                >
                  File a Privacy Complaint →
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
                    { stat: '$1.99', label: 'Per Filing' },
                    { stat: '5 min', label: 'Average Time' },
                    { stat: '1', label: 'Government Agency' },
                    { stat: '3', label: 'Complaint Types' },
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

      {/* What You Can File */}
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
            {complaintTypes.map((ct) => (
              <div key={ct.title} className="bg-bg-alt border border-border rounded-[6px] p-6 hover:border-border-dark transition-colors group cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <span className="font-serif text-4xl text-border-dark group-hover:text-accent transition-colors">
                    {ct.symbol}
                  </span>
                  <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-text-light border border-border rounded-[4px] px-2 py-0.5">
                    $1.99
                  </span>
                </div>
                <h3 className="font-serif text-lg font-bold text-text mb-2">{ct.title}</h3>
                <p className="font-body text-sm text-text-mid leading-relaxed mb-4">{ct.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="font-mono text-[8px] tracking-[0.1em] uppercase bg-bg-dark text-white px-2 py-0.5 rounded-[4px]">
                    {ct.agency}
                  </span>
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
            Three Steps to an Official Filing
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                Simple Pricing
              </p>
              <DoubleRule />

              <div className="text-center py-6">
                <div className="flex items-end justify-center gap-1 mb-1">
                  <span className="font-serif text-6xl font-bold text-text">$1.99</span>
                  <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-text-light mb-3">per filing</span>
                </div>
                <p className="font-body text-sm text-text-mid">Flat fee. No subscription. No surprise charges.</p>
              </div>

              <DoubleRule />

              <ul className="space-y-3 mb-8">
                {[
                  'Formal complaint letter generated',
                  'Faxed to the California Attorney General',
                  'PDF copy emailed to you',
                  'Unique filing receipt ID',
                  'Account to track your filings',
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="font-serif text-accent mt-0.5">§</span>
                    <span className="font-body text-sm text-text-mid">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/file"
                className="block w-full text-center font-mono text-[11px] tracking-[0.1em] uppercase bg-bg-dark text-white py-3 rounded-[6px] hover:bg-text-mid transition-colors"
              >
                File a Complaint — $1.99 →
              </Link>

              <p className="font-mono text-[8px] tracking-[0.05em] uppercase text-text-light text-center mt-4">
                No account required to file · Create one after to track filings
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-8">
            <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-text-light">Support</span>
            <div className="flex-1 border-t border-border" />
          </div>
          <h2 className="font-serif text-3xl font-bold text-text mb-10">
            Common Questions
          </h2>
          <div className="max-w-3xl mx-auto">
            <HomeFaq />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
