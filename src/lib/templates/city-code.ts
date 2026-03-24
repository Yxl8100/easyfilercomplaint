export const cityCodeTemplates: Record<string, string> = {
  ca_ag: `CONSUMER/CIVIL COMPLAINT — CITY CODE VIOLATION

Complainant: {{fullName}}
Date: {{todayDate}}

I am filing this complaint regarding a property or code violation by {{targetName}} that has not been resolved through local channels.

VIOLATION DESCRIPTION:
Date First Observed: {{incidentDate}}
Property Address: {{categoryFields.violationAddress}}
Type of Violation: {{categoryFields.violationTypes}}

{{description}}

The violations described above affect the health, safety, and welfare of residents and the community. Despite the severity of these violations, local enforcement has been inadequate or unavailable.

{{#if priorContact}}I previously contacted {{targetName}} or local authorities regarding this matter. {{priorContactDetails}}{{/if}}

I request that the California Attorney General's Office review this matter and take any available enforcement action.

COMPLAINANT INFORMATION:
Full Name: {{fullName}}
Address: {{address}}
City, State, Zip: {{cityStateZip}}
Phone: {{phone}}
Email: {{email}}
County: {{county}}

RESPONSIBLE PARTY:
Name: {{targetName}}
Address: {{targetAddress}}
Phone: {{targetPhone}}`,
}
