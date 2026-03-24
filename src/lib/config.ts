/**
 * Submission configuration
 *
 * IMPORTANT: In test mode, no real submissions are made.
 * Set EFC_LIVE_SUBMIT=true only when ready to actually file complaints.
 */
export const config = {
  isLiveSubmit: process.env.EFC_LIVE_SUBMIT === 'true',

  get dojEmail(): string {
    return this.isLiveSubmit
      ? 'ada.complaint@usdoj.gov'
      : (process.env.EFC_TEST_EMAIL || 'test@example.com')
  },

  get caAgFax(): string {
    return this.isLiveSubmit ? '+19163235341' : '+15555555555'
  },

  get fdaFax(): string {
    return this.isLiveSubmit ? '+18003320178' : '+15555555555'
  },
}
