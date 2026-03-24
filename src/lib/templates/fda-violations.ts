export const fdaViolationsTemplates: Record<string, string> = {
  fda: `MedWatch Safety Report — Consumer/Patient

I am reporting a serious adverse event or product problem to the FDA MedWatch program.

Product Information:
Product Name: {{categoryFields.productName}}
Lot/Serial Number: {{categoryFields.lotNumber}}
Manufacturer/Distributor: {{targetName}}
Company Website: {{targetUrl}}

Adverse Event/Problem Description:
Date of Incident: {{incidentDate}}

{{description}}

Adverse outcomes observed: {{categoryFields.adverseOutcomes}}

This report is being submitted because the above product caused or may have caused serious harm. I believe this incident warrants investigation by the FDA to protect other consumers from similar harm.

{{#if priorContact}}I previously contacted {{targetName}} regarding this matter. {{priorContactDetails}}{{/if}}

Reporter Information:
Name: {{fullName}}
Address: {{address}}
City, State, Zip: {{cityStateZip}}
Phone: {{phone}}
Email: {{email}}

Date of Report: {{todayDate}}`,

  ca_ag: `CONSUMER COMPLAINT — FDA-REGULATED PRODUCT SAFETY VIOLATION

Complainant: {{fullName}}
Date: {{todayDate}}

I am filing this complaint against {{targetName}} regarding an unsafe or mislabeled FDA-regulated product that caused harm.

PRODUCT INFORMATION:
Product Name: {{categoryFields.productName}}
Lot/Serial Number: {{categoryFields.lotNumber}}
Manufacturer: {{targetName}}
Website: {{targetUrl}}

INCIDENT DESCRIPTION:
Date: {{incidentDate}}

{{description}}

Adverse outcomes: {{categoryFields.adverseOutcomes}}

This conduct may violate California Health and Safety Code provisions regarding the sale of unsafe or mislabeled food, drugs, medical devices, or dietary supplements, as well as California's Unfair Competition Law (Bus. & Prof. Code § 17200 et seq.).

{{#if priorContact}}I previously contacted {{targetName}}. {{priorContactDetails}}{{/if}}

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
