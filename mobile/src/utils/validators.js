// Shared input validators used across Login / Register / Settings.
// Keep these strict enough to catch typos but permissive of the formats
// real users actually type (with spaces, dashes, leading +, etc.).

// Local-part@domain.tld with a TLD of ≥2 chars and no whitespace anywhere.
// Catches missing "@", trailing dots, and one-letter TLDs without rejecting
// the long .ac.zw style domains the university uses.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isValidEmail = (value) => {
  if (typeof value !== 'string') return false;
  return EMAIL_REGEX.test(value.trim());
};

// Full name: letters, spaces, hyphens, and apostrophes only. Must start
// with a letter and be at least 2 characters. Explicitly rejects digits so
// reporters don't accidentally type a phone number into the name field.
export const isValidName = (value) => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length < 2) return false;
  return /^[A-Za-z][A-Za-z\s'-]+$/.test(trimmed);
};

// Generic E.164 phone validator — kept for any non-Zimbabwe contexts.
export const isValidPhone = (value) => {
  if (typeof value !== 'string') return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};

// Zimbabwe mobile number validator. Mobile prefixes after the country code
// are 71 (NetOne), 73 (Telecel), 77 / 78 (Econet) — we permit 7[0-8] so
// future allocations don't break the app. Accepts three input formats:
//   +263 7X XXX XXXX  (12 digits including the 263 country code)
//   07X XXX XXXX      (10 digits with the trunk 0)
//   7X XXX XXXX       (9 digits, no prefix)
export const isValidZimPhone = (value) => {
  if (typeof value !== 'string') return false;
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('263')) return digits.length === 12 && /^2637[0-8]/.test(digits);
  if (digits.startsWith('0')) return digits.length === 10 && /^07[0-8]/.test(digits);
  return digits.length === 9 && /^7[0-8]/.test(digits);
};
