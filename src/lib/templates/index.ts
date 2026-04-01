import { dataPrivacyTemplates } from './data-privacy'
import { consumerProtectionTemplates } from './consumer-protection'
import { fdaViolationsTemplates } from './fda-violations'
import { environmentalTemplates } from './environmental'
import { cityCodeTemplates } from './city-code'
import { accessibilityTemplates } from './accessibility'
import { videoSharingTemplates } from './video-sharing'

const templateMap: Record<string, Record<string, string>> = {
  'data-privacy': dataPrivacyTemplates,
  'consumer-protection': consumerProtectionTemplates,
  'fda-violations': fdaViolationsTemplates,
  environmental: environmentalTemplates,
  'city-code': cityCodeTemplates,
  accessibility: accessibilityTemplates,
  'video-sharing': videoSharingTemplates,
}

export function getTemplate(category: string, agency: string): string {
  const categoryTemplates = templateMap[category]
  if (!categoryTemplates) {
    throw new Error(`No templates found for category: ${category}`)
  }
  const template = categoryTemplates[agency]
  if (!template) {
    throw new Error(`No template found for category: ${category}, agency: ${agency}`)
  }
  return template
}
