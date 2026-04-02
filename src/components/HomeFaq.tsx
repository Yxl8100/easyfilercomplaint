'use client'

import { Accordion } from '@base-ui/react/accordion'
import { ChevronDown } from 'lucide-react'

export const FAQ_ITEMS = [
  {
    id: 'q1',
    question: 'What happens after I file?',
    answer: "Your complaint is faxed directly to the California Attorney General's office. You receive a copy of your complaint PDF by email along with a unique filing receipt ID. Government agencies handle complaints on their own timelines.",
  },
  {
    id: 'q2',
    question: 'Is EasyFilerComplaint a law firm?',
    answer: 'No. EasyFilerComplaint is a complaint filing service. We prepare and transmit your complaint document to the appropriate government office. We do not provide legal advice and no attorney-client relationship is created.',
  },
  {
    id: 'q3',
    question: 'What types of privacy complaints can I file?',
    answer: 'Currently we support three types: privacy tracking violations (CCPA), website accessibility barriers, and video sharing privacy violations. All complaints are submitted to the California Attorney General.',
  },
  {
    id: 'q4',
    question: 'Will I get a refund if my complaint is rejected?',
    answer: 'The $1.99 fee covers the filing service itself — preparing and transmitting your complaint. Agency decisions about whether to act on a complaint are outside our control. Fees are non-refundable after submission.',
  },
  {
    id: 'q5',
    question: 'How do I know my complaint was filed?',
    answer: 'You receive a filing receipt email at the address you provided. The email includes your unique receipt ID (formatted EFC-YYYYMMDD-XXXXX), a copy of your complaint PDF, and confirmation that it was transmitted to the CA AG.',
  },
]

export function HomeFaq() {
  return (
    <Accordion.Root>
      {FAQ_ITEMS.map((item) => (
        <Accordion.Item key={item.id} value={item.id} className="border-b border-border">
          <Accordion.Header>
            <Accordion.Trigger className="font-body text-base font-medium text-text w-full text-left py-4 flex items-center justify-between hover:text-text-mid transition-colors group">
              {item.question}
              <ChevronDown className="w-4 h-4 text-text-light transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel className="font-body text-base text-text-mid leading-relaxed pb-4">
            {item.answer}
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}
