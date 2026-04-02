import { Masthead } from '@/components/Masthead'
import { Footer } from '@/components/Footer'

export const metadata = {
  title: 'About — EasyFilerComplaint',
  description: 'Learn about EasyFilerComplaint and how we help consumers file privacy complaints.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-bg">
      <Masthead />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-serif text-4xl font-bold text-text mb-8">
          About EasyFilerComplaint
        </h1>

        <h2 className="font-serif text-xl font-bold text-text mt-10 mb-4">What We Do</h2>
        <p className="font-body text-base text-text-mid leading-relaxed mb-4">
          EasyFilerComplaint is a consumer filing service that makes it easy to submit formal privacy
          complaints to government agencies. We believe every person should be able to exercise their
          rights without navigating complex government processes.
        </p>

        <h2 className="font-serif text-xl font-bold text-text mt-10 mb-4">How It Works</h2>
        <p className="font-body text-base text-text-mid leading-relaxed mb-4">
          You tell us what happened. We generate a formal complaint letter, fax it directly to the
          California Attorney General&apos;s office, and email you a copy along with a unique filing
          receipt ID. The entire process takes about 5 minutes and costs $1.99.
        </p>

        <h2 className="font-serif text-xl font-bold text-text mt-10 mb-4">Who We Serve</h2>
        <p className="font-body text-base text-text-mid leading-relaxed mb-4">
          Currently, we serve California residents who want to file privacy-related complaints with
          the California Attorney General. We support three complaint types: privacy tracking
          violations (CCPA), website accessibility barriers, and video sharing privacy violations. We
          plan to expand to additional agencies and states in the future.
        </p>

        <h2 className="font-serif text-xl font-bold text-text mt-10 mb-4">Contact</h2>
        <p className="font-body text-base text-text-mid leading-relaxed mb-4">
          Questions? Reach us at{' '}
          <a
            href="mailto:support@easyfilercomplaint.com"
            className="text-text underline hover:text-text-mid transition-colors"
          >
            support@easyfilercomplaint.com
          </a>
        </p>

        <p className="font-body text-base text-text-mid leading-relaxed mb-4 mt-10">
          EasyFilerComplaint is a filing service, not a law firm. We do not provide legal advice.
          Results are not guaranteed.
        </p>
      </main>
      <Footer />
    </div>
  )
}
