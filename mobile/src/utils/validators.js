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

// E.164 allows up to 15 digits; we floor at 7 so short local numbers still
// pass. We strip everything that isn't a digit before counting, so spaces,
// dashes, parens, and a leading + are all fine.
export const isValidPhone = (value) => {
  if (typeof value !== 'string') return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};
