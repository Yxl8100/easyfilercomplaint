'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Loader2 } from 'lucide-react'
import { Masthead } from '@/components/Masthead'
import { Footer } from '@/components/Footer'
import { DoubleRule } from '@/components/DoubleRule'
import { FormField } from '@/components/forms/FormField'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.ok) {
        router.push('/account/filings')
      } else {
        setError('Incorrect email or password. Please try again.')
        setPassword('')
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <Masthead />
      <div className="max-w-3xl mx-auto px-6 py-12">
        <DoubleRule />
        <h1 className="font-serif text-3xl font-bold text-text mb-6">Sign In</h1>

        {error && (
          <div
            role="alert"
            className="bg-accent-bg border border-accent rounded-[6px] p-4 text-sm font-body text-accent mb-4"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="bg-bg-alt border border-border rounded-[6px] p-6 space-y-4">
            <FormField
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <FormField
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="submit"
              disabled={loading}
              aria-disabled={loading}
              aria-busy={loading}
              className="font-mono text-[11px] tracking-[0.1em] uppercase bg-bg-dark text-white w-full py-4 rounded-[6px] hover:bg-text-mid transition-colors min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>

        <p className="font-body text-sm text-text-mid mt-4 text-center">
          Don&apos;t have an account?{' '}
          <a href="/account/create" className="underline text-text">
            Create one free
          </a>
        </p>
      </div>
      <Footer />
    </div>
  )
}
