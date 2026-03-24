export const environmentalTemplates: Record<string, string> = {
  epa: `EPA Environmental Violation Report

To the U.S. Environmental Protection Agency:

I am reporting an environmental violation by {{targetName}} that requires investigation and enforcement action.

VIOLATION DESCRIPTION:
Date First Observed: {{incidentDate}}
Location of Violation: {{categoryFields.pollutionAddress}}
Type of Pollution: {{categoryFields.pollutionTypes}}

{{description}}

{{#if ongoing}}This violation is ongoing and continues to cause harm to the environment and nearby residents.{{/if}}

The reported conduct may violate applicable federal environmental statutes, including but not limited to:
- The Clean Air Act (42 U.S.C. § 7401 et seq.)
- The Clean Water Act (33 U.S.C. § 1251 et seq.)
- The Resource Conservation and Recovery Act (42 U.S.C. § 6901 et seq.)
- The Comprehensive Environmental Response, Compensation, and Liability Act (CERCLA)

{{#if priorContact}}I previously contacted {{targetName}} regarding this matter. {{priorContactDetails}}{{/if}}

I respectfully request that the EPA investigate this matter and take appropriate enforcement action.

Reporter Information:
Name: {{fullName}}
Address: {{address}}
City, State, Zip: {{cityStateZip}}
Phone: {{phone}}
Email: {{email}}

Violating Entity:
Company: {{targetName}}
Website: {{targetUrl}}
Address: {{targetAddress}}

Date of Report: {{todayDate}}`,

  ca_ag: `ENVIRONMENTAL COMPLAINT

Complainant: {{fullName}}
Date: {{todayDate}}

I am filing this complaint against {{targetName}} for environmental violations occurring in California.

VIOLATION DESCRIPTION:
Date First Observed: {{incidentDate}}
Location: {{categoryFields.pollutionAddress}}
Type of Pollution: {{categoryFields.pollutionTypes}}

{{description}}

{{#if ongoing}}This violation is ongoing as of the date of this report.{{/if}}

This conduct may violate California environmental laws including:
- The California Environmental Quality Act (CEQA)
- The Porter-Cologne Water Quality Control Act
- The California Clean Air Act
- California Health and Safety Code provisions on hazardous waste

{{#if priorContact}}I previously contacted the responsible party. {{priorContactDetails}}{{/if}}

I request that the California Attorney General investigate and take appropriate enforcement action.

COMPLAINANT INFORMATION:
Full Name: {{fullName}}
Address: {{address}}
City, State, Zip: {{cityStateZip}}
Phone: {{phone}}
Email: {{email}}
County: {{county}}

RESPONSIBLE PARTY:
Name: {{targetName}}
Website: {{targetUrl}}
Address: {{targetAddress}}`,
}
