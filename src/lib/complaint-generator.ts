import { FilingData } from './filing-state'
import { getTemplate } from './templates/index'

export function generateComplaintText(data: FilingData, agency: string): string {
  const template = getTemplate(data.category, agency)
  return fillTemplate(template, data)
}

function buildVisitDate(data: FilingData): string {
  const fields = data.categoryFields as Record<string, unknown>
  const month = data.visitMonth || (fields?.visitMonth as string | undefined)
  const year = data.visitYear || (fields?.visitYear as string | undefined)
  if (month && year) {
    const names = ['January','February','March','April','May','June','July','August','September','October','November','December']
    const idx = parseInt(month, 10) - 1
    return `${names[idx] ?? month} ${year}`
  }
  if (year) return year
  return 'a recent date'
}

function fillTemplate(template: string, data: FilingData): string {
  const fields = data.categoryFields as Record<string, unknown>
  const trackingTypes = Array.isArray(fields?.trackingTypes)
    ? (fields.trackingTypes as string[]).join(', ')
    : (fields?.trackingTypes ? String(fields.trackingTypes) : '')

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
    .replace(/\{\{phone\}\}/g, data.phone?.trim() || '__OMIT__')
    .replace(/\{\{county\}\}/g, data.county?.trim() || '__OMIT__')
    .replace(/\{\{targetName\}\}/g, data.targetName)
    .replace(/\{\{targetUrl\}\}/g, data.targetUrl || 'N/A')
    .replace(
      /\{\{targetAddress\}\}/g,
      [data.targetAddress, data.targetCity, data.targetState, data.targetZip].filter(Boolean).join(', ') || '__OMIT__'
    )
    .replace(
      /\{\{incidentDate\}\}/g,
      data.incidentDate
        ? new Date(data.incidentDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : buildVisitDate(data)
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

  result = result.replace(/\{\{#if description\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match: string, inner: string) => {
    if (data.description?.trim()) {
      return inner.replace(/\{\{description\}\}/g, data.description)
    }
    return ''
  })

  // Remove lines where a field was empty (__OMIT__ sentinel)
  result = result.replace(/^[^\n]*__OMIT__[^\n]*(\n|$)/gm, '')
  // Normalize runs of 3+ blank lines down to two
  result = result.replace(/\n{3,}/g, '\n\n')

  return result.trim()
}
