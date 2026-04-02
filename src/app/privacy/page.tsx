import { Masthead } from '@/components/Masthead'
import { Footer } from '@/components/Footer'

export const metadata = {
  title: 'Privacy Policy — EasyFilerComplaint',
  description: 'How EasyFilerComplaint collects, uses, and protects your personal information.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg">
      <Masthead />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-serif text-4xl font-bold text-text mb-8">Privacy Policy</h1>
        <p className="font-body text-sm text-text-light mb-8">Effective: April 1, 2026</p>

        <p className="font-body text-base text-text-mid leading-relaxed mb-4">
          EasyFilerComplaint is a complaint filing service, not a law firm. This privacy policy
          describes how we handle your information when you use our service.
        </p>

        <h2 className="font-serif text-xl font-bold text-text mt-10 mb-4">
          What Information We Collect
        </h2>
        <p className="font-body text-base text-text-mid leading-relaxed mb-4">
          When you use EasyFilerComplaint, we collect the following information:
        </p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li className="font-body text-base text-text-mid leading-relaxed">
            <strong>Email address</strong> — required for filing and receipt delivery
          </li>
          <li className="font-body text-base text-text-mid leading-relaxed">
            <strong>Full name</strong> — included in your complaint letter
          </li>
          <li className="font-body text-base text-text-mid leading-relaxed">
            <strong>Complaint details</strong> — business name, description of the violation, and
            complaint type
          </li>
          <li className="font-body text-base text-text-mid leading-relaxed">
            <strong>Payment information</strong> — payment is processed by Stripe; EasyFilerComplaint
            does not store credit card numbers
          </li>
          <li className="font-body text-base text-text-mid leading-relaxed">
            <strong>IP address and basic browser information</strong> — collected through standard web
            server logs
          </li>
        </ul>

        <h2 className="font-serif text-xl font-bold text-text mt-10 mb-4">
          How We Use Your Information
        </h2>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li className="font-body text-base text-text-mid leading-relaxed">
            To prepare and transmit your complaint to the California Attorney General
          </li>
          <li className="font-body text-base text-text-mid leading-relaxed">
            To send you a filing receipt email with your complaint PDF
          </li>
          <li className="font-body text-base text-text-mid leading-relaxed">
            To link filings to your account if you create one
          </li>
          <li className="font-body text-base text-text-mid leading-relaxed">
            To communicate about your filing if necessary
          </li>
        </ul>

        <h2 className="font-serif text-xl font-bold text-text mt-10 mb-4">
          California Residents — Your CCPA Rights
        </h2>
        <p className="font-body text-base text-text-mid leading-relaxed mb-4">
          Under the California Consumer Privacy Act (CCPA), California residents have the following
          rights:
        </p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li className="font-body text-base text-text-mid leading-relaxed">
            <strong>Right to know</strong> — what personal information we collect and how it is used
          </li>
          <li className="font-body text-base text-text-mid leading-relaxed">
            <strong>Right to delete</strong> — request deletion of your personal information
          </li>
          <li className="font-body text-base text-text-mid leading-relaxed">
            <strong>Right to opt out of the sale of personal information</strong> — We do not sell
            your personal information
          </li>
        </ul>
        <p className="font-body text-base text-text-mid leading-relaxed mb-4">
          To exercise these rights, contact us at the email listed below. We will respond to
          verifiable consumer requests within 45 days.
        </p>

        <h2 className="font-serif text-xl font-bold text-text mt-10 mb-4">Data Retention</h2>
        <p className="font-body text-base text-text-mid leading-relaxed mb-4">
          Filing records and complaint documents are retained for the lifetime of your account or 3
          years from the filing date, whichever is longer. You may request deletion at any time by
          contacting support.
        </p>

        <h2 className="font-serif text-xl font-bold text-text mt-10 mb-4">Third-Party Services</h2>
        <p className="font-body text-base text-text-mid leading-relaxed mb-4">
          We share your information with the following third-party services as necessary to operate
          EasyFilerComplaint:
        </p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li className="font-body text-base text-text-mid leading-relaxed">
            <strong>Stripe</strong> — processes payment; receives email and payment card details
          </li>
          <li className="font-body text-base text-text-mid leading-relaxed">
            <strong>Resend</strong> — delivers filing receipt emails; receives your email address
          </li>
          <li className="font-body text-base text-text-mid leading-relaxed">
            <strong>Phaxio</strong> — transmits your complaint via fax to government offices;
            receives the complaint PDF
          </li>
          <li className="font-body text-base text-text-mid leading-relaxed">
            <strong>Vercel</strong> — hosts the application; standard web hosting logs
          </li>
          <li className="font-body text-base text-text-mid leading-relaxed">
            <strong>Neon</strong> — database provider; stores filing records
          </li>
        </ul>

        <h2 className="font-serif text-xl font-bold text-text mt-10 mb-4">Contact</h2>
        <p className="font-body text-base text-text-mid leading-relaxed mb-4">
          For privacy-related questions or to exercise your CCPA rights, contact us at:{' '}
          <a
            href="mailto:support@easyfilercomplaint.com"
            className="text-text underline hover:text-text-mid transition-colors"
          >
            support@easyfilercomplaint.com
          </a>
        </p>
      </main>
      <Footer />
    </div>
  )
}
