import Link from 'next/link'
import { DoubleRule } from '@/components/DoubleRule'

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="border-b-[3px] border-double border-ink bg-cream">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <Link href="/" className="inline-block">
            <div className="flex flex-col leading-none">
              <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-ink-faint">The</span>
              <span className="font-serif text-xl font-bold text-ink tracking-tight">
                EasyFiler<em>Complaint</em>
              </span>
            </div>
          </Link>
        </div>
      </header>

      <div className="border-b border-rule bg-warm">
        <div className="max-w-6xl mx-auto px-6 py-1.5">
          <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-ink-faint">
            Verification Pending · Check Your Inbox
          </span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <div className="bg-paper border border-ink p-8">
            <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-ink-faint mb-2">
              Email Dispatched
            </p>
            <DoubleRule />

            <div className="font-serif text-6xl text-rule-dark my-6">✉</div>

            <h1 className="font-serif text-3xl font-bold text-ink mb-3">
              Check Your Email
            </h1>
            <DoubleRule />
            <p className="font-body text-sm text-ink-light leading-relaxed mt-4 mb-6">
              We&apos;ve sent a secure sign-in link to your email address.
              Click the link to access your account. The link expires in 24 hours.
            </p>

            <p className="font-mono text-[9px] tracking-[0.1em] uppercase text-ink-faint">
              No email?{' '}
              <Link href="/auth/signin" className="text-accent hover:underline">
                Try again
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
