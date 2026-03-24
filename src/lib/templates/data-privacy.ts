export const dataPrivacyTemplates: Record<string, string> = {
  fcc: `Subject: Privacy Complaint — Unauthorized Data Collection by {{targetName}}

Dear Federal Communications Commission,

I am writing to file a formal complaint regarding unauthorized collection and disclosure of my personal information by {{targetName}} ({{targetUrl}}).

On or about {{incidentDate}}, I visited the website operated by {{targetName}} at {{targetUrl}}. During my visit, I discovered that the website was collecting and transmitting my personal browsing data to third-party advertising and analytics companies without my knowledge or consent. Specifically, the website deployed tracking technologies including {{categoryFields.trackingTypes}} that captured my online activity and shared it with third parties.

{{description}}

This conduct violates the privacy protections established under the Communications Act of 1934, as amended, and the FCC's rules regarding customer proprietary network information (CPNI). Consumers have a right to know how their data is being collected and shared, and to provide informed consent before such collection occurs.

{{#if priorContact}}I previously attempted to resolve this matter directly with {{targetName}}. {{priorContactDetails}} Despite my efforts, the unauthorized data collection practices have continued.{{/if}}

I respectfully request that the FCC investigate this matter and take appropriate enforcement action to protect consumer privacy.

Sincerely,
{{fullName}}
{{address}}
{{cityStateZip}}
{{email}}
{{phone}}

Date: {{todayDate}}`,

  ftc: `Subject: Report of Deceptive Data Collection Practices — {{targetName}}

I am reporting deceptive and unfair business practices by {{targetName}} ({{targetUrl}}) related to the unauthorized collection and use of consumer data.

On or about {{incidentDate}}, while using the services of {{targetName}}, I discovered that the company was engaging in deceptive data collection practices. Without adequate notice or consent, the company deployed tracking technologies to collect my personal browsing activity and share it with third-party advertisers and data brokers.

{{description}}

The tracking technologies observed include: {{categoryFields.trackingTypes}}.

This conduct constitutes an unfair and deceptive trade practice in violation of Section 5 of the Federal Trade Commission Act (15 U.S.C. § 45). The company's privacy practices are materially inconsistent with what a reasonable consumer would expect, and the company failed to provide clear and conspicuous notice of its data collection activities.

{{#if amountPaid}}I paid {{amountPaid}} for services from this company, which were represented as being provided in accordance with their stated privacy policy.{{/if}}

{{#if priorContact}}I attempted to resolve this issue directly with the company. {{priorContactDetails}}{{/if}}

I am filing this report to help the FTC identify patterns of deceptive data practices and to protect other consumers from similar harm.

Complainant Information:
Name: {{fullName}}
Address: {{address}}, {{cityStateZip}}
Email: {{email}}
Phone: {{phone}}

Company Information:
Name: {{targetName}}
Website: {{targetUrl}}
Address: {{targetAddress}}

Date of Incident: {{incidentDate}}
Date of Report: {{todayDate}}`,

  ca_ag: `CONSUMER COMPLAINT — DATA PRIVACY VIOLATION

Complainant: {{fullName}}
Date: {{todayDate}}

COMPLAINT DESCRIPTION:

I am filing this complaint against {{targetName}} ({{targetUrl}}) for violations of California consumer privacy laws, including the California Consumer Privacy Act (CCPA) and the California Invasion of Privacy Act (CIPA).

On or about {{incidentDate}}, I discovered that {{targetName}} was collecting and disclosing my personal information without my knowledge or consent. The company's website deployed tracking technologies including {{categoryFields.trackingTypes}} that captured my browsing activity, device information, and other personal data, and transmitted this information to third-party advertising networks and data brokers.

{{description}}

These practices violate my rights under California Civil Code Section 1798.100 et seq. (CCPA), which requires businesses to inform consumers about the categories of personal information collected and the purposes for which it is used, and to obtain consent before selling or sharing personal information.

Additionally, the unauthorized interception and recording of my online communications may violate California Penal Code Section 631 (California Invasion of Privacy Act), which prohibits the interception of electronic communications without consent.

{{#if priorContact}}I contacted {{targetName}} regarding this issue. {{priorContactDetails}}{{/if}}

I request that the Attorney General's Office investigate this matter and take appropriate enforcement action.

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

  doj_ada: `Subject: Complaint of Disability Discrimination — Digital Accessibility and Privacy

Dear U.S. Department of Justice, Civil Rights Division,

I am writing to report a potential violation of the Americans with Disabilities Act as it relates to digital accessibility and privacy practices by {{targetName}} ({{targetUrl}}).

On or about {{incidentDate}}, I attempted to access the website of {{targetName}}. In addition to encountering accessibility barriers that limit equal access for individuals with disabilities, the website deployed tracking technologies that collected my personal data without consent.

{{description}}

The website's data collection practices, combined with its failure to provide accessible privacy controls (such as accessible consent mechanisms and privacy settings), create a discriminatory barrier for individuals with disabilities who cannot effectively opt out of data collection due to inaccessible website design.

{{#if priorContact}}I previously contacted {{targetName}} about these issues. {{priorContactDetails}}{{/if}}

I respectfully request that the Department investigate this matter under Title III of the ADA.

Complainant:
{{fullName}}
{{address}}
{{cityStateZip}}
{{email}}
{{phone}}

Entity Complained About:
{{targetName}}
{{targetUrl}}
{{targetAddress}}

Date of Incident: {{incidentDate}}
Date of Complaint: {{todayDate}}`,
}
