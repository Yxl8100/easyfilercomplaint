import { FilingData } from './filing-state'
import { getTemplate } from './templates/index'

export function generateComplaintText(data: FilingData, agency: string): string {
  const template = getTemplate(data.category, agency)
  return fillTemplate(template, data)
}

function fillTemplate(template: string, data: FilingData): string {
  const fields = data.categoryFields as Record<string, unknown>
  const trackingTypes = Array.isArray(fields?.trackingTypes)
    ? (fields.trackingTypes as string[]).join(', ')
    : String(fields?.trackingTypes || 'various tracking technologies')

  const adverseOutcomes = Array.isArray(fields?.adverseOutcomes)
    ? (fields.adverseOutcomes as string[]).join(', ')
    : String(fields?.adverseOutcomes || '')

  const pollutionTypes = Array.isArray(fields?.pollutionTypes)
    ? (fields.pollutionTypes as string[]).join(', ')
    : String(fields?.pollutionTypes || '')

  const barrierTypes = Array.isArray(fields?.barrierTypes)
    ? (fields.barrierTypes as string[]).join(', ')
    : String(fields?.barrierTypes || '')

  const violationTypes = Array.isArray(fields?.violationTypes)
    ? (fields.violationTypes as string[]).join(', ')
    : String(fields?.violationTypes || '')

  let result = template
    .replace(/\{\{firstName\}\}/g, data.firstName)
    .replace(/\{\{lastName\}\}/g, data.lastName)
    .replace(/\{\{fullName\}\}/g, `${data.firstName} ${data.lastName}`)
    .replace(/\{\{email\}\}/g, data.email)
    .replace(/\{\{address\}\}/g, data.address)
    .replace(/\{\{cityStateZip\}\}/g, `${data.city}, ${data.state} ${data.zip}`)
    .replace(/\{\{phone\}\}/g, data.phone)
    .replace(/\{\{county\}\}/g, data.county || 'N/A')
    .replace(/\{\{targetName\}\}/g, data.targetName)
    .replace(/\{\{targetUrl\}\}/g, data.targetUrl || 'N/A')
    .replace(
      /\{\{targetAddress\}\}/g,
      [data.targetAddress, data.targetCity, data.targetState, data.targetZip].filter(Boolean).join(', ') || 'N/A'
    )
    .replace(
      /\{\{incidentDate\}\}/g,
      data.incidentDate
        ? new Date(data.incidentDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'N/A'
    )
    .replace(/\{\{description\}\}/g, data.description)
    .replace(
      /\{\{todayDate\}\}/g,
      new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    )
    .replace(/\{\{categoryFields\.trackingTypes\}\}/g, trackingTypes)
    .replace(/\{\{categoryFields\.adverseOutcomes\}\}/g, adverseOutcomes)
    .replace(/\{\{categoryFields\.pollutionTypes\}\}/g, pollutionTypes)
    .replace(/\{\{categoryFields\.barrierTypes\}\}/g, barrierTypes)
    .replace(/\{\{categoryFields\.violationTypes\}\}/g, violationTypes)
    .replace(/\{\{categoryFields\.productName\}\}/g, String(fields?.productName || 'N/A'))
    .replace(/\{\{categoryFields\.lotNumber\}\}/g, String(fields?.lotNumber || 'N/A'))
    .replace(/\{\{categoryFields\.promisedVsDelivered\}\}/g, String(fields?.promisedVsDelivered || ''))
    .replace(/\{\{categoryFields\.violationAddress\}\}/g, String(fields?.violationAddress || 'N/A'))
    .replace(/\{\{categoryFields\.pollutionAddress\}\}/g, String(fields?.pollutionAddress || 'N/A'))

  // Handle conditional blocks
  result = result.replace(/\{\{#if amountPaid\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match: string, inner: string) => {
    if (data.amountPaid) {
      return inner
        .replace(/\{\{amountPaid\}\}/g, `$${data.amountPaid.toFixed(2)}`)
        .replace(/\{\{paymentMethod\}\}/g, data.paymentMethod || 'unknown method')
    }
    return ''
  })

  result = result.replace(/\{\{#if priorContact\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match: string, inner: string) => {
    if (data.priorContact) {
      return inner.replace(/\{\{priorContactDetails\}\}/g, data.priorContactDetails || '')
    }
    return ''
  })

  result = result.replace(/\{\{#if ongoing\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match: string, inner: string) => {
    if (fields?.ongoing === 'yes') {
      return inner
    }
    return ''
  })

  return result.trim()
}
