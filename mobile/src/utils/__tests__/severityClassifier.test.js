import { classifySeverity, isLikelyEnglish, seemsLikeIncidentDescription } from '../severityClassifier';

describe('severityClassifier (mobile copy)', () => {
  it('forces off-topic text to low regardless of type', () => {
    expect(classifySeverity('twinkle twinkle little star', 'assault')).toBe('low');
  });

  it('adds +3 for weapon or injury vocabulary on top of the type baseline', () => {
    // assault (3) + knife (3) = 6 → high
    expect(classifySeverity('A man with a knife attacked a student near the gate', 'assault')).toBe('high');
    // theft (2) + bleeding (3) = 5 → high
    expect(classifySeverity('Someone is bleeding badly after being hit at the hostel', 'theft')).toBe('high');
    // vandalism (1) + knife (3) = 4 → medium: the type floor still matters
    expect(classifySeverity('A man with a knife attacked a student near the gate', 'vandalism')).toBe('medium');
  });

  it('uses type baselines', () => {
    expect(classifySeverity('I saw graffiti on the library wall', 'vandalism')).toBe('low');
    expect(classifySeverity('Someone stole my laptop from the library', 'theft')).toBe('medium');
    expect(classifySeverity('A stranger followed me from the gate to the hostel', 'harassment')).toBe('medium');
  });

  it('checks for English and incident vocabulary', () => {
    expect(isLikelyEnglish('I saw someone breaking a window')).toBe(true);
    expect(isLikelyEnglish('short')).toBe(false);
    expect(isLikelyEnglish('ndakaona munhu achityora hwindo')).toBe(false);
    expect(seemsLikeIncidentDescription('la la la la la la')).toBe(false);
    expect(seemsLikeIncidentDescription('I heard screaming near the lab')).toBe(true);
  });
});
