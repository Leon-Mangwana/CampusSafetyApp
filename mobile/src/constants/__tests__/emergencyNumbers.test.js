import {
  CAMPUS_SECURITY_NUMBER, NATIONAL_NUMBERS, getSecurityNumber, POLICE_NUMBER, EMERGENCY_DIRECTORY,
} from '../emergencyNumbers';

describe('emergency numbers', () => {
  it('never falls back to 911 anywhere', () => {
    const all = JSON.stringify({ CAMPUS_SECURITY_NUMBER, NATIONAL_NUMBERS, EMERGENCY_DIRECTORY, s: getSecurityNumber(), p: POLICE_NUMBER });
    expect(all).not.toMatch(/\b911\b/);
  });

  it('always yields a dialable security number', () => {
    expect(getSecurityNumber()).toMatch(/^[+\d][\d\s]+$/);
    expect(POLICE_NUMBER).toBe('995');
  });

  it('marks an unconfigured campus number clearly in the directory', () => {
    const campus = EMERGENCY_DIRECTORY[0].contacts[0];
    if (!CAMPUS_SECURITY_NUMBER) {
      expect(campus.number).toBeNull();
      expect(campus.display).toMatch(/not yet configured/i);
    } else {
      expect(campus.number).toBe(CAMPUS_SECURITY_NUMBER);
    }
  });
});
