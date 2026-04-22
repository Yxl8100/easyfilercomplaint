'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Loader2 } from 'lucide-react'
import { FormField } from '@/components/forms/FormField'

interface AccountCreateFormProps {
  defaultEmail: string
  defaultName: string
  filingId: string | null
}

export function AccountCreateForm({
  defaultEmail,
  defaultName,
  filingId,
}: AccountCreateFormProps) {
  const router = useRouter()
  const [name, setName] = useState(defaultName)
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [emailTaken, setEmailTaken] = useState(false)
  const [loading, setLoading] = useState(false)

  const emailPrefilled = defaultEmail !== ''

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = 'Name is required.'
    if (!email.trim()) next.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address.'
    if (password.length < 8) next.password = 'Password must be at least 8 characters.'
    if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGlobalError(null)
    setEmailTaken(false)
    if (!validate()) return

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email,
          password,
          filingId: filingId ?? undefined,
        }),
      })

      if (res.status === 201) {
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })
        if (result?.ok) {
          router.push('/account/filings')
        } else {
          setGlobalError('Account created but sign-in failed. Please sign in manually.')
          setLoading(false)
        }
        return
      }

      const body = await res.json()
      if (res.status === 409 || body?.error === 'email_taken') {
        setEmailTaken(true)
      } else {
        setGlobalError('Something went wrong. Please try again.')
      }
    } catch {
      setGlobalError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {emailTaken && (
        <div
          role="alert"
          className="bg-accent-bg border border-accent rounded-[6px] p-4 text-sm font-body text-accent mb-4"
        >
          An account with this email already exists.{' '}
          <a href="/login" className="underline">
            Sign in instead.
          </a>
        </div>
      )}
      {globalError && (
        <div
          role="alert"
          className="bg-accent-bg border border-accent rounded-[6px] p-4 text-sm font-body text-accent mb-4"
        >
          {globalError}
        </div>
      )}

      <div className="bg-bg-alt border border-border rounded-[6px] p-6 space-y-4">
        <FormField
          label="Your Name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={errors.name ? 'border-accent' : ''}
        />
        {errors.name && (
          <p className="font-mono text-[9px] text-accent">{errors.name}</p>
        )}

        <FormField
          label="Email"
          type="email"
          required
          readOnly={emailPrefilled}
          aria-label="Email address"
          value={email}
          onChange={emailPrefilled ? undefined : (e) => setEmail(e.target.value)}
          className={`${emailPrefilled ? 'bg-bg-alt cursor-not-allowed' : ''} ${errors.email ? 'border-accent' : ''}`}
          hint={emailPrefilled ? 'Pre-filled from your recent filing' : undefined}
        />
        {errors.email && (
          <p className="font-mono text-[9px] text-accent">{errors.email}</p>
        )}

        <FormField
          label="Password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="At least 8 characters"
          className={`min-h-[44px] ${errors.password ? 'border-accent' : ''}`}
        />
        {errors.password && (
          <p className="font-mono text-[9px] text-accent">{errors.password}</p>
        )}

        <FormField
          label="Confirm Password"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={`min-h-[44px] ${errors.confirmPassword ? 'border-accent' : ''}`}
        />
        {errors.confirmPassword && (
          <p className="font-mono text-[9px] text-accent">{errors.confirmPassword}</p>
        )}

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
              Creating Account...
            </>
          ) : (
            'Create Free Account'
          )}
        </button>
      </div>

      <p className="font-body text-sm text-text-mid mt-4 text-center">
        Already have an account?{' '}
        <a href="/login" className="underline text-text">
          Sign in
        </a>
      </p>
    </form>
  )
}
