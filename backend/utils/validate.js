// Server-side input validation helpers. The mobile app validates too, but the
// API is public, so nothing here may trust the client.

// Same regex as mobile/src/utils/validators.js (keep in sync).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const isEmail = (value) =>
  typeof value === 'string' && value.trim().length <= 254 && EMAIL_REGEX.test(value.trim());

// Generic phone: 7-15 digits once formatting is stripped, max 20 chars raw.
const isPhone = (value) => {
  if (typeof value !== 'string' || value.length > 20) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};

/**
 * Parse a coordinate. Accepts numbers or numeric strings, rejects NaN /
 * Infinity / out-of-range. Returns the number or null. Zero is valid.
 */
const parseCoordinate = (value, min, max) => {
  let n;
  if (typeof value === 'number') n = value;
  else if (typeof value === 'string' && value.trim() !== '') n = Number(value);
  else return null;
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
};

/** Returns { latitude, longitude } or null if either is missing/invalid. */
const parseLatLng = (lat, lng) => {
  const latitude = parseCoordinate(lat, -90, 90);
  const longitude = parseCoordinate(lng, -180, 180);
  if (latitude === null || longitude === null) return null;
  return { latitude, longitude };
};

/** True when both values are absent (undefined/null/''), i.e. not supplied. */
const isAbsent = (value) => value === undefined || value === null || value === '';

/**
 * Validate a free-text string. Returns { value } (trimmed) or { error }.
 */
const requireString = (value, { field, min = 1, max }) => {
  if (typeof value !== 'string') return { error: `${field} is required.` };
  const trimmed = value.trim();
  if (trimmed.length < min) {
    return { error: min === 1 ? `${field} is required.` : `${field} must be at least ${min} characters.` };
  }
  if (max !== undefined && trimmed.length > max) {
    return { error: `${field} must be at most ${max} characters.` };
  }
  return { value: trimmed };
};

/** Optional string: undefined passes through, otherwise same as requireString. */
const optionalString = (value, opts) => {
  if (value === undefined) return { value: undefined };
  return requireString(value, opts);
};

const isOneOf = (value, allowed) => allowed.includes(value);

module.exports = {
  isEmail,
  isPhone,
  parseCoordinate,
  parseLatLng,
  isAbsent,
  requireString,
  optionalString,
  isOneOf,
};
