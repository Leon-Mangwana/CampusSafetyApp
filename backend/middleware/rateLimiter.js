const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
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
