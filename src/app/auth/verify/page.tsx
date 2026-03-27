import Link from 'next/link'

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="border-b border-border bg-bg">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <Link href="/" className="inline-block">
            <span className="font-serif text-xl font-bold text-text tracking-tight">
              EasyFiler<span className="text-accent">Complaint</span>
            </span>
          </Link>
        </div>
      </header>

      <div className="border-b border-border bg-bg-alt">
        <div className="max-w-6xl mx-auto px-6 py-1.5">
          <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-text-light">
            Verification Pending · Check Your Inbox
          </span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <div className="bg-bg border border-border-dark rounded-[6px] p-8">
            <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-light mb-2">
              Email Dispatched
            </p>
            <div className="border-t-2 border-bg-dark my-4" />

            <div className="font-serif text-6xl text-border-dark my-6">✉</div>

            <h1 className="font-serif text-3xl font-bold text-text mb-3">
              Check Your Email
            </h1>
            <div className="border-t border-border my-4" />
            <p className="font-body text-sm text-text-mid leading-relaxed mt-4 mb-6">
              We&apos;ve sent a secure sign-in link to your email address.
              Click the link to access your account. The link expires in 24 hours.
            </p>

            <p className="font-mono text-[9px] tracking-[0.1em] uppercase text-text-light">
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
