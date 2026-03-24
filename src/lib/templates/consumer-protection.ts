export const consumerProtectionTemplates: Record<string, string> = {
  ftc: `Subject: Consumer Fraud Report — {{targetName}}

I am reporting fraudulent and deceptive business practices by {{targetName}} ({{targetUrl}}).

On or about {{incidentDate}}, I was misled by {{targetName}} into a transaction based on false representations. The company engaged in deceptive practices that caused me financial harm.

{{description}}

{{#if amountPaid}}I paid {{amountPaid}} via {{paymentMethod}} for goods or services that were not as advertised or represented.{{/if}}

What was promised versus what was delivered:
{{categoryFields.promisedVsDelivered}}

This conduct constitutes a deceptive trade practice under Section 5(a) of the FTC Act (15 U.S.C. § 45(a)), which prohibits unfair or deceptive acts or practices in or affecting commerce. The company's misrepresentations were material — they influenced my decision to purchase — and caused measurable harm.

{{#if priorContact}}I previously contacted {{targetName}} to resolve this matter. {{priorContactDetails}} The company failed to resolve my complaint satisfactorily.{{/if}}

I request that the FTC take appropriate enforcement action and add this complaint to its Consumer Sentinel database.

Complainant Information:
Name: {{fullName}}
Address: {{address}}, {{cityStateZip}}
Email: {{email}}
Phone: {{phone}}

Company Information:
Name: {{targetName}}
Website: {{targetUrl}}
Address: {{targetAddress}}
Phone: {{targetPhone}}

Date of Incident: {{incidentDate}}
Date of Report: {{todayDate}}`,

  cfpb: `Subject: Financial Consumer Complaint — {{targetName}}

To the Consumer Financial Protection Bureau:

I am submitting this complaint regarding unfair, deceptive, or abusive acts or practices by {{targetName}} in connection with a financial product or service.

COMPLAINT DESCRIPTION:

On or about {{incidentDate}}, {{targetName}} engaged in conduct that constitutes an unfair, deceptive, or abusive act or practice (UDAAP) in violation of the Consumer Financial Protection Act of 2010 (12 U.S.C. § 5531).

{{description}}

{{#if amountPaid}}Amount involved: {{amountPaid}} (paid via {{paymentMethod}}).{{/if}}

What was promised versus what was delivered:
{{categoryFields.promisedVsDelivered}}

{{#if priorContact}}I previously contacted {{targetName}} directly. {{priorContactDetails}} The company failed to adequately resolve my complaint.{{/if}}

I am requesting that the CFPB:
1. Investigate this matter
2. Contact {{targetName}} to obtain a response
3. Take appropriate supervisory and enforcement action
4. Include this complaint in the Consumer Complaint Database

Complainant:
{{fullName}}
{{address}}
{{cityStateZip}}
{{email}}
{{phone}}

Company:
{{targetName}}
{{targetUrl}}
{{targetAddress}}
{{targetPhone}}

Incident Date: {{incidentDate}}
Filed: {{todayDate}}`,

  ca_ag: `CONSUMER COMPLAINT — UNFAIR BUSINESS PRACTICES

Complainant: {{fullName}}
Date: {{todayDate}}

I am filing this complaint against {{targetName}} for violations of California's Unfair Competition Law (Business and Professions Code Section 17200 et seq.) and the California Consumer Legal Remedies Act (Civil Code Section 1750 et seq.).

DESCRIPTION OF COMPLAINT:

On or about {{incidentDate}}, {{targetName}} engaged in unfair and deceptive business practices that caused me harm.

{{description}}

{{#if amountPaid}}I paid {{amountPaid}} via {{paymentMethod}}.{{/if}}

What was promised versus what was actually delivered:
{{categoryFields.promisedVsDelivered}}

California law prohibits businesses from engaging in unfair, unlawful, or fraudulent business practices. {{targetName}}'s conduct constitutes:
- Unlawful business acts in violation of applicable laws
- Unfair business practices causing harm to consumers
- Fraudulent conduct likely to deceive a reasonable consumer

{{#if priorContact}}I previously contacted {{targetName}}. {{priorContactDetails}}{{/if}}

I request that the Attorney General investigate this matter and take appropriate enforcement action.

COMPLAINANT INFORMATION:
Full Name: {{fullName}}
Address: {{address}}
City, State, Zip: {{cityStateZip}}
Phone: {{phone}}
Email: {{email}}
County: {{county}}

COMPANY INFORMATION:
Company Name: {{targetName}}
Website: {{targetUrl}}
Address: {{targetAddress}}
Phone: {{targetPhone}}`,
}
