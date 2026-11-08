// Emergency numbers for Midlands State University, Gweru, Zimbabwe.
//
// OWNER ACTION REQUIRED before release:
//   1. Set CAMPUS_SECURITY_NUMBER to the MSU security control room line.
//   2. Confirm the national numbers below with the ZRP / local authority.
//      Zimbabwe national emergency lines (landline and mobile):
//        Police 995, Ambulance 994, Fire 993, General emergency 999.
//      112 is also routed to emergency services on most mobile networks.
//
// Never fall back to 911 — it is not an emergency number in Zimbabwe.

export const CAMPUS_SECURITY_NUMBER = null; // e.g. '+263 54 2260 404'

export const NATIONAL_NUMBERS = {
  police: { label: 'Police (ZRP)', number: '995' },
  ambulance: { label: 'Ambulance / Medical', number: '994' },
  fire: { label: 'Fire Brigade', number: '993' },
  general: { label: 'General Emergency', number: '999' },
};

/**
 * Number to dial for "Call Security". Uses the campus control room when
 * configured, otherwise the national general emergency line.
 */
export const getSecurityNumber = () =>
  CAMPUS_SECURITY_NUMBER || NATIONAL_NUMBERS.general.number;

export const getSecurityLabel = () =>
  CAMPUS_SECURITY_NUMBER ? 'Campus Security' : 'Emergency (999)';

export const POLICE_NUMBER = NATIONAL_NUMBERS.police.number;

// Grouped list used by the Emergency Numbers screen.
export const EMERGENCY_DIRECTORY = [
  {
    category: 'Campus Security',
    contacts: [
      {
        name: 'Campus Security Control Room',
        number: CAMPUS_SECURITY_NUMBER,
        display: CAMPUS_SECURITY_NUMBER || 'Number not yet configured',
      },
    ],
  },
  {
    category: 'National Emergency (Zimbabwe)',
    contacts: Object.values(NATIONAL_NUMBERS).map((n) => ({
      name: n.label,
      number: n.number,
      display: n.number,
    })),
  },
];
