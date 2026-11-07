const { auth, db } = require('../config/firebase');
const log = require('../utils/logger');

const VALID_ROLES = ['student', 'security', 'admin'];
const STAFF_ROLES = ['security', 'admin'];

const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

/**
 * Resolve the caller's role. Prefers the `role` custom claim on the ID token
 * (set by scripts/create-admin.js and the admin role endpoint); falls back to
 * the users/{uid}/role record for accounts created before claims existed.
 */
const resolveRole = async (decodedToken) => {
  if (VALID_ROLES.includes(decodedToken.role)) return decodedToken.role;
  const snapshot = await db.ref(`users/${decodedToken.uid}/role`).once('value');
  const role = snapshot.val();
  return VALID_ROLES.includes(role) ? role : 'student';
};

/**
 * Attach req.userRole without rejecting. For endpoints that serve everyone
 * but return more detail to staff.
 */
const attachRole = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.userRole = await resolveRole(req.user);
  } catch (error) {
    log.error('auth.role_lookup_failed', { err: error });
    req.userRole = 'student';
  }
  next();
};

const requireRole = (...roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let role;
    try {
      role = await resolveRole(req.user);
    } catch (error) {
      log.error('auth.role_lookup_failed', { err: error });
      return res.status(500).json({ error: 'Could not verify permissions.' });
    }

    if (!role || !roles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    req.userRole = role;
    next();
  };
};

const isStaff = (role) => STAFF_ROLES.includes(role);

module.exports = { authenticateUser, requireRole, attachRole, resolveRole, isStaff, VALID_ROLES, STAFF_ROLES };
