const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// On campus Wi-Fi every student shares one NAT address, so anything that
// protects an authenticated route MUST key by user id, not IP. Otherwise three
// SOS alerts from three different students would lock out the whole campus.
// These limiters run after authenticateUser, so req.user is available.
const perUser = (req) => (req.user?.uid ? `uid:${req.user.uid}` : ipKeyGenerator(req.ip));

// Global brake on mutating requests, keyed by IP because it runs before auth.
// Generous on purpose: the real per-user limits live below. Reads are skipped
// because polling screens generate hundreds of GETs per session.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3000,
  skip: (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS',
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public registration endpoint (no user yet) — IP keyed, hourly.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: { error: 'Too many accounts created from this network. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Per-user read budget. Current polling intervals can reach ~900 GETs per
// 15 minutes on the dashboard during an active SOS; Phase 3 lowers that.
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1200,
  keyGenerator: perUser,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Per-user write budget for ordinary mutations (profile, location, mark read).
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  keyGenerator: perUser,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Incident reports: 10 per user per 10 minutes.
const reportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  keyGenerator: perUser,
  message: { error: 'Too many reports submitted. Please wait before submitting again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// SOS: 3 per user per 5 minutes. Never block another student's emergency.
// Rejected attempts (validation errors, server errors) do not count, so a
// client bug cannot burn through a student's quota before the real alert.
const sosLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  keyGenerator: perUser,
  skipFailedRequests: true,
  message: { error: 'Too many SOS alerts. Please wait.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  registerLimiter,
  readLimiter,
  writeLimiter,
  reportLimiter,
  sosLimiter,
};
