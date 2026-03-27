import Link from 'next/link'
import { Masthead } from '@/components/Masthead'
import { Footer } from '@/components/Footer'
import { DoubleRule } from '@/components/DoubleRule'

const agencyGuides: Record<string, {
  name: string
  url: string
  steps: { title: string; instruction: string; hasCopyBlock?: boolean }[]
}> = {
  ftc: {
    name: 'Federal Trade Commission',
    url: 'https://reportfraud.ftc.gov',
    steps: [
      { title: 'Go to the FTC Report Portal', instruction: 'Visit ReportFraud.ftc.gov and click the "Report Now" button.' },
      { title: 'Select Your Complaint Category', instruction: 'Choose the category that best matches your complaint from the options provided.' },
      { title: 'Answer the Screening Questions', instruction: 'The FTC will ask a few questions to route your complaint correctly. Answer as accurately as possible.' },
      { title: 'Paste Your Complaint Description', instruction: 'When asked to describe what happened, paste the complaint text we generated for you.', hasCopyBlock: true },
      { title: 'Enter Company Information', instruction: 'Enter the business name, website, address, and contact information as you provided in our form.' },
      { title: 'Enter Your Contact Information', instruction: 'Fill in your name, address, email, and phone number.' },
      { title: 'Submit and Save Your Report Number', instruction: 'After submission, save your FTC report number. You will receive an email confirmation.' },
    ],
  },
  fcc: {
    name: 'Federal Communications Commission',
    url: 'https://consumercomplaints.fcc.gov',
    steps: [
      { title: 'Go to the FCC Consumer Portal', instruction: 'Visit consumercomplaints.fcc.gov and click "File a Complaint".' },
      { title: 'Select the Service Type', instruction: 'For privacy complaints, select "Internet" or the relevant communications service.' },
      { title: 'Select "Privacy" as the Issue', instruction: 'Choose "Privacy" from the list of complaint types.' },
      { title: 'Enter the Company Name', instruction: 'Type the company name in the search field and select the matching result.' },
      { title: 'Describe the Issue', instruction: 'Paste the complaint text we generated for you into the description field.', hasCopyBlock: true },
      { title: 'Fill In Your Contact Details', instruction: 'Enter your name, address, email, and phone number.' },
      { title: 'Submit', instruction: 'Review your complaint and click Submit. Save the confirmation number.' },
    ],
  },
  cfpb: {
    name: 'Consumer Financial Protection Bureau',
    url: 'https://www.consumerfinance.gov/complaint',
    steps: [
      { title: 'Go to the CFPB Complaint Portal', instruction: 'Visit consumerfinance.gov/complaint and click "Submit a Complaint".' },
      { title: 'Select the Financial Product', instruction: 'Choose the type of financial product or service involved (credit card, loan, bank account, etc.).' },
      { title: 'Describe the Problem', instruction: 'Select the issue type, then paste the complaint text we generated for you.', hasCopyBlock: true },
      { title: 'Enter Company Information', instruction: 'Search for and select the financial company. Enter the account number if applicable.' },
      { title: 'Add Your Contact Details', instruction: 'Fill in your personal information.' },
      { title: 'Review and Submit', instruction: 'Review all information, check the confirmation boxes, and submit. The CFPB will forward your complaint to the company, which must respond within 15 days.' },
    ],
  },
  epa: {
    name: 'Environmental Protection Agency',
    url: 'https://echo.epa.gov/report-environmental-violations',
    steps: [
      { title: 'Go to the EPA Reporting Portal', instruction: 'Visit echo.epa.gov/report-environmental-violations.' },
      { title: 'Select the Violation Type', instruction: 'Choose the type of environmental violation from the dropdown menu.' },
      { title: 'Provide the Location', instruction: 'Enter the address or description of where the violation is occurring.' },
      { title: 'Describe the Violation', instruction: 'Enter the details of what you observed. Paste the complaint text we generated.', hasCopyBlock: true },
      { title: 'Enter Your Contact Information', instruction: 'Contact information is optional for EPA reports, but providing it allows the EPA to follow up with you.' },
      { title: 'Submit the Report', instruction: 'Submit your environmental violation report. You may also report by calling the EPA at 1-800-424-4372.' },
    ],
  },
}

interface GuidePageProps {
  params: { agency: string }
}

export default function GuidePage({ params }: GuidePageProps) {
  const guide = agencyGuides[params.agency]
  if (!guide) {
    return (
      <div className="min-h-screen bg-bg">
        <Masthead />
        <div className="max-w-3xl mx-auto px-6 py-12">
          <h1 className="font-serif text-3xl font-bold text-text">Agency guide not found</h1>
          <Link href="/file" className="font-mono text-[11px] tracking-[0.1em] uppercase text-accent mt-4 block">
            ← Back to filing
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      <Masthead />
      <div className="border-b border-border bg-bg-alt">
        <div className="max-w-3xl mx-auto px-6 py-1.5">
          <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-text-light">
            Guided Filing · {guide.name}
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <DoubleRule />
          <h1 className="font-serif text-3xl font-bold text-text mt-4 mb-2">
            File with {guide.name}
          </h1>
          <p className="font-body text-sm text-text-mid mb-4">
            Follow these steps to submit your complaint directly on the {guide.name} website.
          </p>
          <a
            href={guide.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block font-mono text-[11px] tracking-[0.1em] uppercase bg-bg-dark text-white px-6 py-2.5 rounded-[6px] hover:bg-text-mid transition-colors"
          >
            Open {guide.name} Website ↗
          </a>
        </div>

        <div className="space-y-3">
          {guide.steps.map((step, index) => (
            <div key={index} className="bg-bg border border-border rounded-[6px] p-6">
              <div className="flex gap-4">
                <div className="font-serif text-3xl font-bold text-border-dark flex-shrink-0 w-8">
                  {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][index]}.
                </div>
                <div className="flex-1">
                  <h3 className="font-serif text-lg font-bold text-text mb-2">{step.title}</h3>
                  <p className="font-body text-sm text-text-mid leading-relaxed">{step.instruction}</p>
                  {step.hasCopyBlock && (
                    <div className="mt-3 bg-bg-alt border border-border rounded-[6px] p-3">
                      <p className="font-mono text-[8px] tracking-[0.1em] uppercase text-text-light mb-2">
                        Tip: Use the complaint text from your filing dashboard
                      </p>
                      <p className="font-body text-xs text-text-mid">
                        Your personalized complaint text was generated and can be copied from your complaint dashboard.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-bg border border-border-dark rounded-[6px] p-6">
          <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-light mb-4">After You File</p>
          <DoubleRule />
          <div className="mt-4 space-y-3">
            <p className="font-body text-sm text-text-mid">Once you&apos;ve submitted your complaint, mark it as filed and optionally record your confirmation number.</p>
            <div className="space-y-2">
              <label className="block font-mono text-[9px] tracking-[0.15em] uppercase text-text-light">
                Confirmation / Tracking Number (optional)
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Enter confirmation number..."
                  className="flex-1 border border-border bg-bg text-text font-body text-sm px-4 py-2 rounded-[6px] focus:outline-none focus:border-bg-dark"
                />
                <button className="font-mono text-[11px] tracking-[0.1em] uppercase bg-bg-dark text-white px-6 py-2 rounded-[6px] hover:bg-text-mid transition-colors">
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/file"
            className="font-mono text-[9px] tracking-[0.1em] uppercase text-text-light hover:text-text transition-colors"
          >
            ← Back to Filing
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  )
}
