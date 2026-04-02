import { describe, it, expect } from 'vitest'
import { FAQ_ITEMS } from './HomeFaq'

const PROHIBITED = ['DPW', 'Pro Veritas', 'APFC', 'ComplianceSweep', 'IdentifiedVerified']

describe('HomeFaq', () => {
  it('exports exactly 5 FAQ items (MKTG-03)', () => {
    expect(FAQ_ITEMS).toHaveLength(5)
  })

  it('FAQ content contains zero prohibited entity strings (MKTG-07)', () => {
    const allContent = FAQ_ITEMS.map(item => `${item.question} ${item.answer}`).join(' ')
    for (const term of PROHIBITED) {
      expect(allContent).not.toContain(term)
    }
  })

  it('each FAQ item has id, question, and answer', () => {
    for (const item of FAQ_ITEMS) {
      expect(item.id).toBeTruthy()
      expect(item.question).toBeTruthy()
      expect(item.answer).toBeTruthy()
    }
  })
})
