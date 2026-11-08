// Minimal structured logger. Writes one JSON object per line so logs can be
// shipped to any aggregator, and strips personal data before it is written.
//
// Usage:
//   const log = require('../utils/logger');
//   log.info('sos.created', { alertId, locationStatus });
//   log.error('sos.failed', { err });

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[(process.env.LOG_LEVEL || 'info').toLowerCase()] || LEVELS.info;

// Keys whose values must never reach the logs.
const SENSITIVE_KEYS = new Set([
  'latitude', 'longitude', 'lat', 'lng', 'lastLatitude', 'lastLongitude',
  'phone', 'userPhone', 'email', 'fullName', 'userName', 'displayName',
  'emergencyContacts', 'pushToken', 'fcmToken', 'password', 'token',
  'authorization', 'description',
]);

const redact = (value, depth = 0) => {
  if (value === null || value === undefined) return value;
  if (value instanceof Error) {
    return { name: value.name, message: value.message, code: value.code, stack: depth === 0 ? value.stack : undefined };
  }
  if (Array.isArray(value)) return depth > 4 ? '[array]' : value.map((v) => redact(v, depth + 1));
  if (typeof value === 'object') {
    if (depth > 4) return '[object]';
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEYS.has(k) ? '[redacted]' : redact(v, depth + 1);
    }
    return out;
  }
  return value;
};

const write = (level, event, fields) => {
  if (LEVELS[level] < threshold) return;
  const entry = {
    time: new Date().toISOString(),
    level,
    event,
    ...(fields ? redact(fields) : {}),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
};

module.exports = {
  debug: (event, fields) => write('debug', event, fields),
  info: (event, fields) => write('info', event, fields),
  warn: (event, fields) => write('warn', event, fields),
  error: (event, fields) => write('error', event, fields),
  redact,
};
