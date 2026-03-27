import Link from 'next/link'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-bg">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <Link href="/" className="inline-block">
            <span className="font-serif text-xl font-bold text-text tracking-tight">
              EasyFiler<span className="text-accent">Complaint</span>
            </span>
          </Link>
        </div>
      </header>

      {/* Sub-header */}
      <div className="border-b border-border bg-bg-alt">
        <div className="max-w-6xl mx-auto px-6 py-1.5">
          <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-text-light">
            Secure Sign In · Consumer Account Portal
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="bg-bg border border-border-dark rounded-[6px] p-8">
            <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-light text-center mb-2">
              Account Access
            </p>
            <div className="border-t-2 border-bg-dark my-4" />

            <h1 className="font-serif text-3xl font-bold text-text text-center mt-4 mb-2">
              Sign In to File
            </h1>
            <p className="font-body text-sm text-text-light text-center mb-6">
              Access your complaint dashboard and file with government agencies.
            </p>

            <div className="border-t border-border my-4" />

            {/* Email form */}
            <form className="space-y-4 mt-6" action="/api/auth/signin/resend" method="POST">
              <div>
                <label className="block font-mono text-[9px] tracking-[0.15em] uppercase text-text-light mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="your@email.com"
                  className="w-full border border-border bg-bg text-text font-body text-sm px-4 py-2.5 rounded-[6px] focus:outline-none focus:border-bg-dark placeholder:text-text-light"
                />
              </div>
              <input type="hidden" name="callbackUrl" value="/dashboard" />
              <button
                type="submit"
                className="w-full font-mono text-[11px] tracking-[0.1em] uppercase bg-bg-dark text-white py-3 rounded-[6px] hover:bg-text-mid transition-colors"
              >
                Send Magic Link →
              </button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 border-t border-border" />
              <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-text-light">or</span>
              <div className="flex-1 border-t border-border" />
            </div>

            {/* Google OAuth */}
            <form action="/api/auth/signin/google" method="POST">
              <input type="hidden" name="callbackUrl" value="/dashboard" />
              <button
                type="submit"
                className="w-full font-mono text-[11px] tracking-[0.1em] uppercase border border-border text-text-mid py-3 rounded-[6px] hover:border-border-dark hover:text-text transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </form>

            <p className="font-mono text-[8px] tracking-[0.05em] uppercase text-text-light text-center mt-6">
              By signing in you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
