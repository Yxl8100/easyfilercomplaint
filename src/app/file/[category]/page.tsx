'use client'

import { useState, useCallback } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCategoryById } from '@/lib/categories'
import { FilingData, defaultFilingData } from '@/lib/filing-state'
import { generateComplaintText } from '@/lib/complaint-generator'
import { Masthead } from '@/components/Masthead'
import { Footer } from '@/components/Footer'
import { DoubleRule } from '@/components/DoubleRule'
import { ProgressBar } from '@/components/forms/ProgressBar'
import { StepHeader } from '@/components/forms/StepHeader'
import { StepNavigation } from '@/components/forms/StepNavigation'
import { FormField } from '@/components/forms/FormField'
import { FormTextarea } from '@/components/forms/FormTextarea'
import { FormSelect } from '@/components/forms/FormSelect'
import { FormCheckboxGroup } from '@/components/forms/FormCheckboxGroup'

const PAYMENT_METHODS = [
  { value: 'credit-card', label: 'Credit Card' },
  { value: 'debit-card', label: 'Debit Card' },
  { value: 'check', label: 'Check' },
  { value: 'cash', label: 'Cash' },
  { value: 'wire', label: 'Wire Transfer' },
  { value: 'paypal', label: 'PayPal / Venmo / Zelle' },
  { value: 'crypto', label: 'Cryptocurrency' },
  { value: 'other', label: 'Other' },
]

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

const TRACKING_TYPES = [
  { value: 'cookies', label: 'Cookies' },
  { value: 'tracking-pixels', label: 'Tracking pixels' },
  { value: 'analytics', label: 'Analytics software' },
  { value: 'location', label: 'Location tracking' },
  { value: 'data-sharing', label: 'Data sharing with third parties' },
  { value: 'other', label: 'Other' },
]

const FDA_OUTCOMES = [
  { value: 'hospitalization', label: 'Hospitalization' },
  { value: 'disability', label: 'Disability or permanent impairment' },
  { value: 'life-threatening', label: 'Life-threatening event' },
  { value: 'death', label: 'Death' },
  { value: 'serious-outcome', label: 'Other serious outcome' },
  { value: 'product-quality', label: 'Product quality problem' },
]

const POLLUTION_TYPES = [
  { value: 'air', label: 'Air pollution' },
  { value: 'water', label: 'Water contamination' },
  { value: 'soil', label: 'Soil contamination' },
  { value: 'noise', label: 'Noise pollution' },
  { value: 'chemical', label: 'Chemical spill' },
  { value: 'illegal-dumping', label: 'Illegal dumping' },
  { value: 'other', label: 'Other' },
]

const BARRIER_TYPES = [
  { value: 'website', label: 'Website not accessible' },
  { value: 'physical', label: 'Physical building barrier' },
  { value: 'no-accommodations', label: 'No accommodations provided' },
  { value: 'service-animal', label: 'Service animal denied' },
  { value: 'other', label: 'Other' },
]

const CITY_CODE_VIOLATIONS = [
  { value: 'building-code', label: 'Building code violation' },
  { value: 'noise', label: 'Noise ordinance violation' },
  { value: 'zoning', label: 'Zoning violation' },
  { value: 'property-maintenance', label: 'Property maintenance' },
  { value: 'health-safety', label: 'Health or safety hazard' },
  { value: 'other', label: 'Other' },
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
    selectedAgencies: category.agencies.map((a) => a.id),
  })
  const [expandedText, setExpandedText] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const update = useCallback((patch: Partial<FilingData>) => {
    setData((prev) => ({ ...prev, ...patch }))
  }, [])

  const updateCategoryField = useCallback((key: string, value: unknown) => {
    setData((prev) => ({
      ...prev,
      categoryFields: { ...prev.categoryFields, [key]: value },
    }))
  }, [])

  const toggleAgency = (agencyId: string) => {
    const selected = data.selectedAgencies
    if (selected.includes(agencyId)) {
      update({ selectedAgencies: selected.filter((id) => id !== agencyId) })
    } else {
      update({ selectedAgencies: [...selected, agencyId] })
    }
  }

  const downloadPdf = async (agencyId: string) => {
    try {
      const res = await fetch('/api/preview-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, agency: agencyId }),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `complaint-${agencyId}-preview.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('PDF download failed', e)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
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

  const selectedAgencyObjects = category.agencies.filter((a) =>
    data.selectedAgencies.includes(a.id)
  )

  const totalCost = selectedAgencyObjects.length * 0.5

  return (
    <div className="min-h-screen bg-bg">
      <Masthead />
      <ProgressBar currentStep={step + 1} />

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Step 0: Confirm Agencies */}
        {step === 0 && (
          <div>
            <StepHeader
              step={1}
              title={`${category.label} Complaint`}
              description={category.description}
            />

            <div className="bg-bg-alt border border-border rounded-[6px] p-6 mb-6">
              <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-text-light mb-3">
                Why Multiple Agencies?
              </p>
              <p className="font-body text-sm text-text-mid leading-relaxed">
                Filing with multiple agencies creates a stronger record and increases the likelihood of action. Each agency has different enforcement powers — the FTC can levy fines, the CA Attorney General can sue, and the CFPB can mandate refunds. We file all of them from one form.
              </p>
            </div>

            <div className="space-y-2">
              {category.agencies.map((agency) => {
                const isSelected = data.selectedAgencies.includes(agency.id)
                return (
                  <div key={agency.id} className="bg-bg border border-border rounded-[6px] p-4 flex items-center justify-between">
                    <label className="flex items-center gap-4 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAgency(agency.id)}
                        className="w-4 h-4 border border-border accent-text"
                      />
                      <div>
                        <p className="font-serif text-base font-bold text-text">{agency.name}</p>
                        <span
                          className={`font-mono text-[8px] tracking-[0.1em] uppercase px-2 py-0.5 rounded-[4px] ${
                            agency.method === 'guided'
                              ? 'bg-bg-alt text-text-mid border border-border'
                              : 'bg-bg-dark text-white'
                          }`}
                        >
                          {agency.method === 'guided' ? 'Guided Filing' : 'We File For You'}
                        </span>
                      </div>
                    </label>
                    <span className="font-mono text-sm text-text-light">$0.50</span>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 p-4 bg-bg-alt border border-border rounded-[6px] flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-text-light">
                Total ({data.selectedAgencies.length} {data.selectedAgencies.length === 1 ? 'agency' : 'agencies'})
              </span>
              <span className="font-serif text-xl font-bold text-text">${totalCost.toFixed(2)}</span>
            </div>

            <StepNavigation
              onBack={undefined}
              onContinue={() => setStep(1)}
              continueDisabled={data.selectedAgencies.length === 0}
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

        {/* Step 2: Incident Details */}
        {step === 2 && (
          <div>
            <StepHeader
              step={3}
              title="What Happened?"
              description="Describe the incident. Be as specific as possible — dates, amounts, and exact statements help."
            />
            <div className="space-y-5">
              <FormField
                label="Date of Incident"
                type="date"
                value={data.incidentDate || ''}
                onChange={(e) => update({ incidentDate: e.target.value })}
              />

              <FormTextarea
                label="Describe What Happened"
                required
                rows={6}
                value={data.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder={
                  params.category === 'data-privacy'
                    ? 'Describe what tracking you observed, what data was collected, and how you discovered it...'
                    : params.category === 'consumer-protection'
                    ? 'Describe what was advertised, what you purchased, and how the product or service fell short...'
                    : params.category === 'fda-violations'
                    ? 'Describe the product, when and how you used it, and what adverse effects occurred...'
                    : params.category === 'environmental'
                    ? 'Describe the pollution or environmental violation you observed, including location and severity...'
                    : params.category === 'city-code'
                    ? 'Describe the code violation, its location, and how it affects you or the community...'
                    : 'Describe the accessibility barrier you encountered and how it affected your ability to access the service...'
                }
              />

              {/* Category-specific fields */}
              {params.category === 'data-privacy' && (
                <FormCheckboxGroup
                  label="What Types of Tracking Did You Notice?"
                  options={TRACKING_TYPES}
                  selected={(data.categoryFields.trackingTypes as string[]) || []}
                  onChange={(val) => updateCategoryField('trackingTypes', val)}
                />
              )}

              {params.category === 'fda-violations' && (
                <>
                  <FormField
                    label="Product Name"
                    value={String(data.categoryFields.productName || '')}
                    onChange={(e) => updateCategoryField('productName', e.target.value)}
                    placeholder="Product name as listed on packaging"
                  />
                  <FormField
                    label="Lot / Serial Number (if known)"
                    value={String(data.categoryFields.lotNumber || '')}
                    onChange={(e) => updateCategoryField('lotNumber', e.target.value)}
                  />
                  <FormCheckboxGroup
                    label="Adverse Outcome"
                    options={FDA_OUTCOMES}
                    selected={(data.categoryFields.adverseOutcomes as string[]) || []}
                    onChange={(val) => updateCategoryField('adverseOutcomes', val)}
                  />
                </>
              )}

              {params.category === 'environmental' && (
                <>
                  <FormCheckboxGroup
                    label="Type of Pollution"
                    options={POLLUTION_TYPES}
                    selected={(data.categoryFields.pollutionTypes as string[]) || []}
                    onChange={(val) => updateCategoryField('pollutionTypes', val)}
                  />
                  <FormField
                    label="Location / Address of Violation"
                    value={String(data.categoryFields.pollutionAddress || '')}
                    onChange={(e) => updateCategoryField('pollutionAddress', e.target.value)}
                    placeholder="Street address or description of location"
                  />
                  <div className="space-y-2">
                    <label className="block font-mono text-[9px] tracking-[0.15em] uppercase text-text-light">
                      Is This Ongoing?
                    </label>
                    <div className="flex gap-4">
                      {['yes', 'no'].map((v) => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="ongoing"
                            value={v}
                            checked={data.categoryFields.ongoing === v}
                            onChange={() => updateCategoryField('ongoing', v)}
                            className="accent-text"
                          />
                          <span className="font-body text-sm text-text capitalize">{v}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {params.category === 'accessibility' && (
                <>
                  <FormCheckboxGroup
                    label="Type of Accessibility Barrier"
                    options={BARRIER_TYPES}
                    selected={(data.categoryFields.barrierTypes as string[]) || []}
                    onChange={(val) => updateCategoryField('barrierTypes', val)}
                  />
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
                </>
              )}

              {params.category === 'consumer-protection' && (
                <FormTextarea
                  label="What Was Promised vs. What Was Delivered?"
                  rows={4}
                  value={String(data.categoryFields.promisedVsDelivered || '')}
                  onChange={(e) => updateCategoryField('promisedVsDelivered', e.target.value)}
                  placeholder="Promised: free returns within 30 days. Delivered: denied return after 7 days, charged restocking fee..."
                />
              )}

              {params.category === 'city-code' && (
                <>
                  <FormCheckboxGroup
                    label="Type of Violation"
                    options={CITY_CODE_VIOLATIONS}
                    selected={(data.categoryFields.violationTypes as string[]) || []}
                    onChange={(val) => updateCategoryField('violationTypes', val)}
                  />
                  <FormField
                    label="Property Address of Violation"
                    value={String(data.categoryFields.violationAddress || '')}
                    onChange={(e) => updateCategoryField('violationAddress', e.target.value)}
                    placeholder="123 Main St, City, State ZIP"
                  />
                </>
              )}

              {/* Amount paid — show for consumer-protection and fda-violations */}
              {(params.category === 'consumer-protection' || params.category === 'fda-violations') && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    label="Amount Paid (optional)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={data.amountPaid !== undefined ? String(data.amountPaid) : ''}
                    onChange={(e) => update({ amountPaid: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="0.00"
                  />
                  <FormSelect
                    label="Payment Method (optional)"
                    value={data.paymentMethod || ''}
                    onChange={(e) => update({ paymentMethod: e.target.value })}
                    options={PAYMENT_METHODS}
                  />
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
            </div>

            <StepNavigation
              onBack={() => setStep(1)}
              onContinue={() => setStep(3)}
              continueDisabled={!data.description.trim()}
            />
          </div>
        )}

        {/* Step 3: Your Information */}
        {step === 3 && (
          <div>
            <StepHeader
              step={4}
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
              onBack={() => setStep(2)}
              onContinue={() => setStep(4)}
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

        {/* Step 4: Review */}
        {step === 4 && (
          <div>
            <StepHeader
              step={5}
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
                  <span>Category:</span>
                  <span className="font-serif text-text font-bold">{category.label}</span>
                </div>
                <div className="flex justify-between">
                  <span>Against:</span>
                  <span className="font-serif text-text font-bold">{data.targetName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Agencies:</span>
                  <span className="font-serif text-text font-bold">{selectedAgencyObjects.map(a => a.name).join(', ')}</span>
                </div>
              </div>
            </div>

            {/* Attestation */}
            <div className="bg-bg-alt border border-border rounded-[6px] p-4 mb-6">
              <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-text-light mb-2">Attestation</p>
              <p className="font-body text-sm text-text-mid leading-relaxed">
                I certify that the information in this complaint is true and accurate to the best of my knowledge.
              </p>
            </div>

            {/* Agency complaint previews */}
            <div className="space-y-4 mb-6">
              {selectedAgencyObjects.map((agency) => {
                let complaintText = ''
                try {
                  complaintText = generateComplaintText(data, agency.id)
                } catch {
                  complaintText = '[Template not available for this combination]'
                }
                const preview = complaintText.slice(0, 200)
                const isExpanded = expandedText === agency.id
                const wordCount = complaintText.split(/\s+/).length

                return (
                  <div key={agency.id} className="bg-bg-alt border border-border rounded-[6px]">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <span className="font-serif text-base font-bold text-text">{agency.name}</span>
                        <span
                          className={`font-mono text-[8px] tracking-[0.1em] uppercase px-2 py-0.5 rounded-[4px] ${
                            agency.method === 'guided'
                              ? 'border border-border text-text-light'
                              : 'bg-bg-dark text-white'
                          }`}
                        >
                          {agency.method === 'guided' ? 'Guided' : 'We File'}
                        </span>
                      </div>
                      <button
                        onClick={() => downloadPdf(agency.id)}
                        className="font-mono text-[9px] tracking-[0.1em] uppercase text-text-mid hover:text-text border border-border rounded-[6px] px-3 py-1 transition-colors"
                      >
                        Download PDF ↓
                      </button>
                    </div>
                    <div className="p-4">
                      <pre className="font-body text-xs text-text-mid leading-relaxed whitespace-pre-wrap">
                        {isExpanded ? complaintText : `${preview}...`}
                      </pre>
                      <button
                        onClick={() => setExpandedText(isExpanded ? null : agency.id)}
                        className="mt-2 font-mono text-[9px] tracking-[0.1em] uppercase text-accent hover:text-text transition-colors"
                      >
                        {isExpanded ? 'Collapse ↑' : `Full text (~${wordCount} words) →`}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Cost */}
            <div className="border border-bg-dark rounded-[6px] p-6 mb-6 bg-bg-alt">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-text-light">Filing Cost</span>
              </div>
              <div className="flex justify-between font-body text-sm text-text-mid py-1 border-b border-border">
                <span>Privacy Complaint Filing</span>
                <span>$1.99</span>
              </div>
              <div className="flex justify-between mt-3">
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-text">Total</span>
                <span className="font-serif text-xl font-bold text-text">$1.99</span>
              </div>
            </div>

            {submitError && (
              <div className="mb-4 p-4 bg-accent-bg border border-accent rounded-[6px]">
                <p className="font-mono text-[9px] tracking-[0.1em] uppercase text-accent mb-1">Payment Error</p>
                <p className="font-body text-sm text-text">{submitError}</p>
              </div>
            )}

            <StepNavigation
              onBack={() => setStep(3)}
              onContinue={handleSubmit}
              continueLabel={isSubmitting ? 'Redirecting to Stripe...' : 'Pay & File — $1.99 →'}
              continueDisabled={isSubmitting}
              isLast
            />
          </div>
        )}

        {/* Step 5: Confirmation (reached via Stripe webhook redirect, not directly from wizard) */}
        {step === 5 && (
          <div className="py-12">
            <div className="text-center mb-8">
              <div className="font-serif text-6xl text-border-dark mb-6">✓</div>
              <DoubleRule />
              <h2 className="font-serif text-3xl font-bold text-text mt-6 mb-3">
                Complaint Submitted
              </h2>
              <p className="font-mono text-[9px] tracking-[0.1em] uppercase text-text-light mt-2">
                A receipt has been sent to {data.email}
              </p>
            </div>

            <div className="text-center">
              <Link
                href="/file"
                className="inline-block font-mono text-[11px] tracking-[0.1em] uppercase border border-bg-dark text-text px-8 py-3 rounded-[6px] hover:bg-bg-dark hover:text-white transition-colors"
              >
                File Another Complaint
              </Link>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
