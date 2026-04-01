export const videoSharingTemplates: Record<string, string> = {
  ca_ag: `CONSUMER COMPLAINT -- VIDEO SHARING PRIVACY VIOLATION

Complainant: {{fullName}}
Date: {{todayDate}}

COMPLAINT DESCRIPTION:

I am filing this complaint against {{targetName}} ({{targetUrl}}) for violations of California privacy law, including California Civil Code Section 1708.85 and the California Consumer Privacy Act (CCPA).

On or about {{incidentDate}}, {{targetName}} distributed, published, or otherwise shared video or image content depicting me without my knowledge or consent. This content was shared or distributed via the platform or service operated at {{targetUrl}}.

{{description}}

This conduct violates California Civil Code Section 1708.85, which prohibits the intentional distribution of intimate images or personal video content without consent and imposes civil liability for such unauthorized distribution. Additionally, the collection and use of video and image data identifying me constitutes the collection of biometric and personal information governed by the California Consumer Privacy Act (Cal. Civ. Code § 1798.100 et seq.), which requires prior informed consent.

The company's failure to obtain my consent before distributing this content caused me significant harm, including invasion of privacy, emotional distress, and reputational injury.

{{#if priorContact}}I previously contacted {{targetName}} regarding this matter. {{priorContactDetails}} Despite my efforts, the company has not taken adequate corrective action.{{/if}}

I respectfully request that the Attorney General's Office investigate this matter and take appropriate enforcement action to protect consumer privacy rights.

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
Address: {{targetAddress}}`,
}
