'use client'

import { useState, useCallback, useRef } from 'react'
import { notFound } from 'next/navigation'
import { getCategoryById } from '@/lib/categories'
import { FilingData, defaultFilingData } from '@/lib/filing-state'
import { Masthead } from '@/components/Masthead'
import { Footer } from '@/components/Footer'
import { ProgressBar } from '@/components/forms/ProgressBar'
import { StepHeader } from '@/components/forms/StepHeader'
import { StepNavigation } from '@/components/forms/StepNavigation'
import { FormField } from '@/components/forms/FormField'
import { FormTextarea } from '@/components/forms/FormTextarea'
import { FormSelect } from '@/components/forms/FormSelect'

const COMPLAINT_TYPES = [
  {
    value: 'privacy_tracking',
    label: 'Privacy & Tracking',
    subLabel: 'Unauthorized data collection, cookies, CCPA violations',
  },
  {
    value: 'accessibility',
    label: 'Accessibility (ADA)',
    subLabel: 'Website barriers, physical access, service animal denial',
  },
  {
    value: 'video_sharing',
    label: 'Video Sharing & Streaming',
    subLabel: 'Cable operator violations, streaming privacy, VPPA',
  },
]

const MONTHS = [
  { value: '01', label: 'January' }, { value: '02', label: 'February' },
  { value: '03', label: 'March' },   { value: '04', label: 'April' },
  { value: '05', label: 'May' },     { value: '06', label: 'June' },
  { value: '07', label: 'July' },    { value: '08', label: 'August' },
  { value: '09', label: 'September' },{ value: '10', label: 'October' },
  { value: '11', label: 'November' },{ value: '12', label: 'December' },
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 6 }, (_, i) => {
  const y = currentYear - i
  return { value: String(y), label: String(y) }
})

const AGE_RANGES = [
  { value: 'under-18', label: 'Under 18' },
  { value: '18-24', label: '18–24' },
  { value: '25-34', label: '25–34' },
  { value: '35-44', label: '35–44' },
  { value: '45-54', label: '45–54' },
  { value: '55-64', label: '55–64' },
  { value: '65-plus', label: '65 or older' },
  { value: 'prefer-not', label: 'Prefer not to say' },
]

interface WizardProps {
  params: { category: string }
}

export default function FilingWizard({ params }: WizardProps) {
  const category = getCategoryById(params.category)
  if (!category) notFound()

  const [step, setStep] = useState(0)
  const [data, setData] = useState<FilingData>({
    ...defaultFilingData,
    category: params.category,
    selectedAgencies: ['ca_ag'],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [evidenceError, setEvidenceError] = useState<string | null>(null)
  const [attested, setAttested] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const update = useCallback((patch: Partial<FilingData>) => {
    setData((prev) => ({ ...prev, ...patch }))
  }, [])

  const updateCategoryField = useCallback((key: string, value: unknown) => {
    setData((prev) => ({
      ...prev,
      categoryFields: { ...prev.categoryFields, [key]: value },
    }))
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setEvidenceError('File exceeds 5 MB. Please compress or choose a smaller file.')
      return
    }
    const allowed = ['application/pdf', 'image/png', 'image/jpeg']
    if (!allowed.includes(file.type)) {
      setEvidenceError('Only PDF, PNG, and JPG files are accepted.')
      return
    }
    setEvidenceError(null)
    setEvidenceFile(file)
  }

  const handleRemoveFile = () => {
    setEvidenceFile(null)
    setEvidenceError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      let evidenceFileUrl: string | undefined
      let evidenceFileName: string | undefined

      if (evidenceFile) {
        const formData = new FormData()
        formData.append('file', evidenceFile)
        const upRes = await fetch('/api/upload-evidence', { method: 'POST', body: formData })
        if (!upRes.ok) throw new Error('Evidence upload failed')
        const upData = await upRes.json()
        evidenceFileUrl = upData.url
        evidenceFileName = upData.filename
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, evidenceFileUrl, evidenceFileName }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'We could not start the payment process. Please try again or contact support.')
      }
      window.location.href = result.url
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'We could not start the payment process. Please try again or contact support.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <Masthead />
      <ProgressBar currentStep={step} />

      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Step 0: Complaint Type */}
        {step === 0 && (
          <div>
            <StepHeader
              step={1}
              title="What type of complaint are you filing?"
              description="Select the category that best describes your complaint."
            />
            <div className="space-y-2">
              {COMPLAINT_TYPES.map((ct) => {
                const isSelected = data.category === ct.value
                return (
                  <div
                    key={ct.value}
                    onClick={() => update({ category: ct.value })}
                    className={`bg-bg border rounded-[6px] p-4 cursor-pointer ${
                      isSelected ? 'border-bg-dark' : 'border-border'
                    }`}
                  >
                    <p className="font-serif text-base font-bold text-text">{ct.label}</p>
                    <p className="font-body text-sm text-text-mid">{ct.subLabel}</p>
                  </div>
                )
              })}
            </div>
            <StepNavigation
              onBack={undefined}
              onContinue={() => setStep(1)}
              continueDisabled={!data.category}
            />
          </div>
        )}

        {/* Step 1: Business Info */}
        {step === 1 && (
          <div>
            <StepHeader
              step={2}
              title="Who Are You Filing Against?"
              description="Enter information about the business or individual you're complaining about."
            />
            <div className="space-y-5">
              <FormField
                label="Business / Company Name"
                required
                value={data.targetName}
                onChange={(e) => update({ targetName: e.target.value })}
                placeholder="Acme Corporation"
              />
              <FormField
                label="Website URL"
                type="url"
                value={data.targetUrl || ''}
                onChange={(e) => update({ targetUrl: e.target.value })}
                placeholder="https://example.com"
              />
              <FormField
                label="Business Address"
                value={data.targetAddress || ''}
                onChange={(e) => update({ targetAddress: e.target.value })}
                placeholder="123 Main St"
              />
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  label="City"
                  value={data.targetCity || ''}
                  onChange={(e) => update({ targetCity: e.target.value })}
                />
                <FormField
                  label="State"
                  value={data.targetState || ''}
                  onChange={(e) => update({ targetState: e.target.value })}
                  placeholder="CA"
                  maxLength={2}
                />
                <FormField
                  label="ZIP Code"
                  value={data.targetZip || ''}
                  onChange={(e) => update({ targetZip: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Phone"
                  type="tel"
                  value={data.targetPhone || ''}
                  onChange={(e) => update({ targetPhone: e.target.value })}
                />
                <FormField
                  label="Email"
                  type="email"
                  value={data.targetEmail || ''}
                  onChange={(e) => update({ targetEmail: e.target.value })}
                />
              </div>
            </div>
            <StepNavigation
              onBack={() => setStep(0)}
              onContinue={() => setStep(2)}
              continueDisabled={!data.targetName.trim()}
            />
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div>
            <StepHeader
              step={3}
              title="What Happened?"
              description="Describe the incident. Be as specific as possible — dates, amounts, and exact statements help."
            />
            <div className="space-y-5">
              <FormTextarea
                label="Describe What Happened"
                required
                rows={6}
                value={data.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder={
                  params.category === 'privacy_tracking'
                    ? 'Describe what tracking you observed, what data was collected, and how you discovered it...'
                    : params.category === 'accessibility'
                    ? 'Describe the accessibility barrier you encountered and how it affected your ability to access the service...'
                    : 'Describe the cable or streaming violation, including when it occurred and how it affected you...'
                }
              />

              {/* Category-specific fields */}
              {params.category === 'accessibility' && (
                <div className="space-y-2">
                  <label className="block font-mono text-[9px] tracking-[0.15em] uppercase text-text-light">
                    Do You Have a Disability Affected By This?
                  </label>
                  <div className="flex gap-4">
                    {['yes', 'no', 'prefer-not-to-say'].map((v) => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="hasDisability"
                          value={v}
                          checked={data.categoryFields.hasDisability === v}
                          onChange={() => updateCategoryField('hasDisability', v)}
                          className="accent-text"
                        />
                        <span className="font-body text-sm text-text capitalize">{v.replace(/-/g, ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Prior contact */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="block font-mono text-[9px] tracking-[0.15em] uppercase text-text-light">
                    Did You Contact the Business About This?
                  </label>
                  <div className="flex gap-4">
                    {[
                      { value: true, label: 'Yes' },
                      { value: false, label: 'No' },
                    ].map(({ value, label }) => (
                      <label key={label} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="priorContact"
                          checked={data.priorContact === value}
                          onChange={() => update({ priorContact: value })}
                          className="accent-text"
                        />
                        <span className="font-body text-sm text-text">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {data.priorContact && (
                  <FormTextarea
                    label="What Happened When You Contacted Them?"
                    rows={3}
                    value={data.priorContactDetails || ''}
                    onChange={(e) => update({ priorContactDetails: e.target.value })}
                    placeholder="Describe the response you received (or lack thereof)..."
                  />
                )}
              </div>

              {/* Visit date dropdowns -- WIZ-02 */}
              <div className="grid grid-cols-2 gap-4">
                <FormSelect
                  label="Approximate Visit Date"
                  hint="Approximate date is sufficient."
                  value={data.visitMonth || ''}
                  onChange={(e) => update({ visitMonth: e.target.value })}
                  options={MONTHS}
                />
                <FormSelect
                  label="Year"
                  value={data.visitYear || ''}
                  onChange={(e) => update({ visitYear: e.target.value })}
                  options={YEARS}
                />
              </div>

              {/* Evidence upload -- WIZ-03 */}
              <div>
                <label className="block font-mono text-[9px] tracking-[0.15em] uppercase text-text-light mb-1.5">
                  Supporting Evidence (optional)
                </label>
                <label className="block bg-bg-alt border border-dashed border-border-dark rounded-[6px] p-6 text-center cursor-pointer hover:border-bg-dark transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {evidenceFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <span className="font-body text-sm text-text">File selected: {evidenceFile.name}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); handleRemoveFile() }}
                        className="font-mono text-[9px] uppercase text-text-light hover:text-accent transition-colors"
                      >
                        Remove ×
                      </button>
                    </div>
                  ) : (
                    <span className="font-body text-sm text-text-mid">Attach a PDF, PNG, or JPG — max 5 MB</span>
                  )}
                </label>
                {evidenceError && (
                  <div className="mt-2 p-3 bg-accent-bg border border-accent rounded-[6px]">
                    <p className="font-mono text-[9px] uppercase text-accent">{evidenceError}</p>
                  </div>
                )}
              </div>
            </div>

            <StepNavigation
              onBack={() => setStep(1)}
              onContinue={() => setStep(3)}
              continueDisabled={!data.description.trim()}
            />
          </div>
        )}

        {/* Step 3: Agency */}
        {step === 3 && (
          <div>
            <StepHeader
              step={4}
              title="Your complaint will be filed with:"
              description="At launch, EasyFilerComplaint files with the California Attorney General. Additional agencies are coming soon."
            />
            <div className="space-y-2">
              <div className="bg-bg border border-border rounded-[6px] p-4">
                <p className="font-serif text-base font-bold text-text">California Attorney General</p>
              </div>
              <div className="opacity-50 cursor-not-allowed bg-bg border border-border rounded-[6px] p-4 flex items-center gap-3">
                <p className="font-serif text-base font-bold text-text">FCC</p>
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] bg-accent-bg text-accent border border-accent px-2 py-0.5 rounded-[4px]">
                  Coming Soon
                </span>
              </div>
            </div>
            <StepNavigation
              onBack={() => setStep(2)}
              onContinue={() => setStep(4)}
            />
          </div>
        )}

        {/* Step 4: Your Information */}
        {step === 4 && (
          <div>
            <StepHeader
              step={5}
              title="Your Information"
              description="Most agencies require your contact information to process a complaint."
            />

            <div className="bg-bg-alt border border-border rounded-[6px] p-4 mb-6">
              <p className="font-mono text-[9px] tracking-[0.1em] uppercase text-text-light">
                Your information is required by most agencies and is protected under federal privacy laws. It will only be shared with the agencies you select.
              </p>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="First Name"
                  required
                  value={data.firstName}
                  onChange={(e) => update({ firstName: e.target.value })}
                />
                <FormField
                  label="Last Name"
                  required
                  value={data.lastName}
                  onChange={(e) => update({ lastName: e.target.value })}
                />
              </div>
              <FormField
                label="Email Address"
                type="email"
                required
                value={data.email}
                onChange={(e) => update({ email: e.target.value })}
              />
              <FormField
                label="Mailing Address"
                required
                value={data.address}
                onChange={(e) => update({ address: e.target.value })}
              />
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  label="City"
                  required
                  value={data.city}
                  onChange={(e) => update({ city: e.target.value })}
                />
                <FormField
                  label="State"
                  required
                  value={data.state}
                  onChange={(e) => update({ state: e.target.value })}
                  placeholder="CA"
                  maxLength={2}
                />
                <FormField
                  label="ZIP Code"
                  required
                  value={data.zip}
                  onChange={(e) => update({ zip: e.target.value })}
                />
              </div>
              <FormField
                label="Phone Number"
                type="tel"
                required
                value={data.phone}
                onChange={(e) => update({ phone: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="County (optional)"
                  value={data.county || ''}
                  onChange={(e) => update({ county: e.target.value })}
                  hint="Required by CA Attorney General"
                />
                <FormSelect
                  label="Age Range (optional)"
                  value={data.ageRange || ''}
                  onChange={(e) => update({ ageRange: e.target.value })}
                  options={AGE_RANGES}
                />
              </div>
            </div>

            <StepNavigation
              onBack={() => setStep(3)}
              onContinue={() => setStep(5)}
              continueDisabled={
                !data.firstName.trim() ||
                !data.lastName.trim() ||
                !data.email.trim() ||
                !data.address.trim() ||
                !data.city.trim() ||
                !data.state.trim() ||
                !data.zip.trim() ||
                !data.phone.trim()
              }
            />
          </div>
        )}

        {/* Step 5: Review & Pay */}
        {step === 5 && (
          <div>
            <StepHeader
              step={6}
              title="Review & Pay"
              description="Your complaint is ready. Complete payment to file."
            />

            {/* Summary */}
            <div className="bg-bg-alt border border-border rounded-[6px] p-6 mb-6">
              <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-light mb-4 pb-2 border-b border-border">
                Filing Summary
              </p>
              <div className="space-y-2 text-sm font-body text-text-mid">
                <div className="flex justify-between">
                  <span>Complaint Type:</span>
                  <span className="font-serif text-text font-bold">
                    {COMPLAINT_TYPES.find(ct => ct.value === data.category)?.label ?? data.category}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Against:</span>
                  <span className="font-serif text-text font-bold">{data.targetName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Agency:</span>
                  <span className="font-serif text-text font-bold">California Attorney General</span>
                </div>
                {(data.visitMonth || data.visitYear) && (
                  <div className="flex justify-between">
                    <span>Approx. Visit Date:</span>
                    <span className="font-serif text-text font-bold">
                      {[data.visitMonth && MONTHS.find(m => m.value === data.visitMonth)?.label, data.visitYear].filter(Boolean).join(' ')}
                    </span>
                  </div>
                )}
                {evidenceFile && (
                  <div className="flex justify-between">
                    <span>Evidence:</span>
                    <span className="font-serif text-text font-bold">{evidenceFile.name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Filed By:</span>
                  <span className="font-serif text-text font-bold">{data.firstName} {data.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="font-serif text-text font-bold">{data.email}</span>
                </div>
              </div>
            </div>

            {/* Cost */}
            <div className="border border-bg-dark rounded-[6px] p-6 mb-6 bg-bg-alt">
              <div className="flex justify-between font-body text-sm text-text-mid py-1 border-b border-border">
                <span>Privacy Complaint Filing</span>
                <span>$1.99</span>
              </div>
              <div className="flex justify-between mt-3">
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-text">Total</span>
                <span className="font-serif text-xl font-bold text-text">$1.99</span>
              </div>
            </div>

            {/* Attestation checkbox -- WIZ-06 */}
            <label className="flex items-start gap-3 cursor-pointer mb-6">
              <input
                type="checkbox"
                checked={attested}
                onChange={(e) => setAttested(e.target.checked)}
                className="mt-0.5 accent-text"
              />
              <span className="font-body text-sm text-text-mid">
                I certify that the information in this complaint is true and accurate
                to the best of my knowledge.
              </span>
            </label>

            {submitError && (
              <div className="mb-4 p-4 bg-accent-bg border border-accent rounded-[6px]">
                <p className="font-mono text-[9px] tracking-[0.1em] uppercase text-accent mb-1">Payment Error</p>
                <p className="font-body text-sm text-text">{submitError}</p>
              </div>
            )}

            <StepNavigation
              onBack={() => setStep(4)}
              onContinue={handleSubmit}
              continueLabel={isSubmitting ? 'Redirecting to Stripe...' : 'Pay & File \u2014 $1.99 \u2192'}
              continueDisabled={!attested || isSubmitting}
              isLast
            />
          </div>
        )}

      </div>
      <Footer />
    </div>
  )
}
