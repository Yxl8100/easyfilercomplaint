export const accessibilityTemplates: Record<string, string> = {
  doj_ada: `Subject: ADA Title III Complaint — {{targetName}}

Dear U.S. Department of Justice, Civil Rights Division,

I am writing to file a complaint under Title III of the Americans with Disabilities Act of 1990 (42 U.S.C. § 12181 et seq.) against {{targetName}}.

COMPLAINT DESCRIPTION:

On or about {{incidentDate}}, I experienced discrimination on the basis of disability when attempting to access the goods, services, facilities, privileges, advantages, or accommodations offered by {{targetName}}.

{{description}}

Type of barrier(s) encountered: {{categoryFields.barrierTypes}}

Title III of the ADA requires places of public accommodation to provide full and equal enjoyment of goods, services, facilities, privileges, advantages, and accommodations to individuals with disabilities. The conduct described above violates this requirement.

{{#if priorContact}}I previously contacted {{targetName}} to request accommodation. {{priorContactDetails}}{{/if}}

I respectfully request that the Department of Justice:
1. Investigate this complaint
2. Mediate a resolution between myself and {{targetName}}
3. Take appropriate enforcement action if warranted

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

  fcc: `Subject: Accessibility Complaint — {{targetName}}

Dear Federal Communications Commission,

I am filing this complaint regarding accessibility barriers encountered with communications services or technology provided by {{targetName}}.

On or about {{incidentDate}}, I encountered the following accessibility barriers that prevented me from equally accessing the communications services of {{targetName}}:

{{description}}

Type of barrier(s): {{categoryFields.barrierTypes}}

The FCC's accessibility rules (47 C.F.R. Parts 6, 7, 14, and 79) require covered entities to make communications services and equipment accessible to individuals with disabilities. {{targetName}}'s failure to provide accessible communications services violates these requirements.

{{#if priorContact}}I contacted {{targetName}} to request accessible service. {{priorContactDetails}}{{/if}}

I request that the FCC investigate this matter and require {{targetName}} to come into compliance with accessibility requirements.

Complainant:
{{fullName}}
{{address}}
{{cityStateZip}}
{{email}}
{{phone}}

Entity:
{{targetName}}
{{targetUrl}}

Date of Incident: {{incidentDate}}
Date of Complaint: {{todayDate}}`,

  ca_ag: `DISABILITY DISCRIMINATION COMPLAINT — ADA/UNRUH ACT

Complainant: {{fullName}}
Date: {{todayDate}}

I am filing this complaint against {{targetName}} for discrimination against persons with disabilities in violation of the Americans with Disabilities Act and California's Unruh Civil Rights Act (Civil Code § 51 et seq.).

DISCRIMINATION DESCRIPTION:

On or about {{incidentDate}}, I was denied equal access to the goods, services, or facilities of {{targetName}} due to disability-related barriers.

{{description}}

Type of barrier(s): {{categoryFields.barrierTypes}}

California's Unruh Civil Rights Act (Civil Code § 51) prohibits discrimination by businesses on the basis of disability and incorporates the full protections of the ADA. Violations of the ADA constitute per se violations of the Unruh Act.

{{#if priorContact}}I previously contacted {{targetName}} to request accessible service or accommodation. {{priorContactDetails}}{{/if}}

I request that the California Attorney General investigate this matter and take appropriate enforcement action.

COMPLAINANT INFORMATION:
Full Name: {{fullName}}
Address: {{address}}
City, State, Zip: {{cityStateZip}}
Phone: {{phone}}
Email: {{email}}
County: {{county}}

ENTITY INFORMATION:
Name: {{targetName}}
Website: {{targetUrl}}
Address: {{targetAddress}}`,
}
