const rateLimit = require('express-rate-limit');

// General API rate limiter — applies only to mutating requests. Auto-refreshing
// screens (heatmap every 5s, dashboard every 10s) easily generate hundreds of
// GETs per session, so rate-limiting reads would block normal use. Writes are
// where abuse can actually occur (mass-spam reports etc.) so the cap stays
// applied to POST/PUT/PATCH/DELETE.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  skip: (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS',
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for incident reports (prevent flooding)
const reportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  message: { error: 'Too many reports submitted. Please wait before submitting again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// SOS alert limiter
const sosLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3,
  message: { error: 'Too many SOS alerts. Please wait.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, reportLimiter, sosLimiter };
