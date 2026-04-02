import { Masthead } from '@/components/Masthead'
import { Footer } from '@/components/Footer'

export const metadata = {
  title: 'Terms of Service — EasyFilerComplaint',
  description: 'Terms and conditions for using the EasyFilerComplaint filing service.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg">
      <Masthead />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-serif text-4xl font-bold text-text mb-8">Terms of Service</h1>
        <p className="font-body text-sm text-text-light mb-8">Effective: April 1, 2026</p>

        <h2 className="font-serif text-xl font-bold text-text mt-10 mb-4">Service Description</h2>
        <p className="font-body text-base text-text-mid leading-relaxed mb-4">
          EasyFilerComplaint is a complaint filing service. We are not a law firm and do not provide
          legal advice.
        </p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li className="font-body text-base text-text-mid leading-relaxed">
            EasyFilerComplaint prepares formal complaint documents based on the information you
            provide
          </li>
          <li className="font-body text-base text-text-mid leading-relaxed">
            EasyFilerComplaint transmits complaints to the California Attorney General via fax
          </li>
          <li className="font-body text-base text-text-mid leading-relaxed">
            EasyFilerComplaint sends you a copy of your complaint via email
          </li>
          <li className="font-body text-base text-text-mid leading-relaxed">
            The service costs $1.99 per filing
          </li>
        </ul>

        <h2 className="font-serif text-xl font-bold text-text mt-10 mb-4">
          No Attorney-Client Relationship
        </h2>
        <p className="font-body text-base text-text-mid leading-relaxed mb-4">
          By using EasyFilerComplaint, you understand and agree that no attorney-client relationship
          is created between you and EasyFilerComplaint.
        </p>
        <p className="font-body text-base text-text-mid leading-relaxed mb-4">
          We do not represent you in any legal proceeding.
        </p>
        <p className="font-body text-base text-text-mid leading-relaxed mb-4">
          If you need legal advice, consult a licensed professional in your jurisdiction.
        </p>

        <h2 className="font-serif text-xl font-bold text-text mt-10 mb-4">
          No Guarantee of Outcome
        </h2>
        <p className="font-body text-base text-text-mid leading-relaxed mb-4">
          Filing a complaint does not guarantee any particular action by the government agency.
          EasyFilerComplaint&apos;s responsibility ends with successful transmission of your
          complaint. Government agencies process complaints at their own discretion and timeline.
        </p>

        <h2 className="font-serif text-xl font-bold text-text mt-10 mb-4">Acceptable Use</h2>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li className="font-body text-base text-text-mid leading-relaxed">
            Complaints must be truthful and submitted in good faith
          </li>
          <li className="font-body text-base text-text-mid leading-relaxed">
            Submitting knowingly false information is prohibited
          </li>
          <li className="font-body text-base text-text-mid leading-relaxed">
            Fraudulent use of the service may result in account termination
          </li>
        </ul>

        <h2 className="font-serif text-xl font-bold text-text mt-10 mb-4">Payment Terms</h2>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li className="font-body text-base text-text-mid leading-relaxed">
            The filing fee is $1.99 per complaint
          </li>
          <li className="font-body text-base text-text-mid leading-relaxed">
            Payment is processed securely via Stripe
          </li>
          <li className="font-body text-base text-text-mid leading-relaxed">
            Fees are non-refundable once the complaint has been transmitted
          </li>
          <li className="font-body text-base text-text-mid leading-relaxed">
            Filing fees cover the preparation and transmission service, not the outcome
          </li>
        </ul>

        <h2 className="font-serif text-xl font-bold text-text mt-10 mb-4">Governing Law</h2>
        <p className="font-body text-base text-text-mid leading-relaxed mb-4">
          These terms are governed by the laws of the State of Arizona, without regard to conflict of
          law principles.
        </p>

        <h2 className="font-serif text-xl font-bold text-text mt-10 mb-4">
          Limitation of Liability
        </h2>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li className="font-body text-base text-text-mid leading-relaxed">
            EasyFilerComplaint&apos;s total liability is limited to the amount paid for the specific
            filing in question
          </li>
          <li className="font-body text-base text-text-mid leading-relaxed">
            EasyFilerComplaint is not liable for any actions or inactions by government agencies
          </li>
          <li className="font-body text-base text-text-mid leading-relaxed">
            EasyFilerComplaint is not liable for indirect, incidental, or consequential damages
          </li>
        </ul>

        <h2 className="font-serif text-xl font-bold text-text mt-10 mb-4">Dispute Resolution</h2>
        <p className="font-body text-base text-text-mid leading-relaxed mb-4">
          Disputes will first be addressed through informal negotiation via email at{' '}
          <a
            href="mailto:support@easyfilercomplaint.com"
            className="text-text underline hover:text-text-mid transition-colors"
          >
            support@easyfilercomplaint.com
          </a>
          . If unresolved after 30 days, disputes will be resolved through binding arbitration in
          Maricopa County, Arizona.
        </p>
      </main>
      <Footer />
    </div>
  )
}
