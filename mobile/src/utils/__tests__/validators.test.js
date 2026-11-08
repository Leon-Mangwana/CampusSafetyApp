import { isValidEmail, isValidName, isValidPhone, isValidZimPhone } from '../validators';

describe('validators', () => {
  it('validates emails', () => {
    expect(isValidEmail('student@msu.ac.zw')).toBe(true);
    expect(isValidEmail('bad@')).toBe(false);
    expect(isValidEmail(42)).toBe(false);
  });

  it('validates names', () => {
    expect(isValidName("Mary-Anne O'Neil")).toBe(true);
    expect(isValidName('A')).toBe(false);
    expect(isValidName('0771234567')).toBe(false);
  });

  it('validates generic phones', () => {
    expect(isValidPhone('+263 77 123 4567')).toBe(true);
    expect(isValidPhone('12345')).toBe(false);
  });

  it('validates Zimbabwe mobile numbers in all three formats', () => {
    expect(isValidZimPhone('+263 77 123 4567')).toBe(true);
    expect(isValidZimPhone('077 123 4567')).toBe(true);
    expect(isValidZimPhone('77 123 4567')).toBe(true);
    expect(isValidZimPhone('+263 79 123 4567')).toBe(false);
    expect(isValidZimPhone('0881234567')).toBe(false);
  });
});
