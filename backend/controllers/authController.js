const { auth, db } = require('../config/firebase');
const { VALID_ROLES } = require('../middleware/auth');
const { isEmail, isPhone, parseLatLng, requireString, optionalString } = require('../utils/validate');
const log = require('../utils/logger');

// Presence coordinates are rounded to 4 decimals (~11 m): enough to decide
// "nearby", not enough to place someone at a door.
const roundCoord = (n) => Number(n.toFixed(4));

const MAX_EMERGENCY_CONTACTS = 5;

// Validate & normalise an emergencyContacts array.
// Each entry must have {name, phone}. Returns {valid, contacts|error}.
const normaliseEmergencyContacts = (input) => {
  if (input === undefined || input === null) return { valid: true, contacts: [] };
  if (!Array.isArray(input)) {
    return { valid: false, error: 'emergencyContacts must be an array.' };
  }
  if (input.length > MAX_EMERGENCY_CONTACTS) {
    return { valid: false, error: `At most ${MAX_EMERGENCY_CONTACTS} emergency contacts allowed.` };
  }
  const contacts = [];
  for (const c of input) {
    if (!c || typeof c !== 'object') {
      return { valid: false, error: 'Each emergency contact must be an object with name and phone.' };
    }
    const name = typeof c.name === 'string' ? c.name.trim().slice(0, 80) : '';
    const phone = typeof c.phone === 'string' ? c.phone.trim() : '';
    if (!name || !isPhone(phone)) {
      return { valid: false, error: 'Each emergency contact needs a name and a valid phone number.' };
    }
    contacts.push({ name, phone });
  }
  return { valid: true, contacts };
};

/**
 * Register a new user. Every self-registered account is a student; the
 * `role` field in the body is deliberately ignored. Security and admin roles
 * are granted only via scripts/create-admin.js or PUT /auth/users/:uid/role.
 */
const register = async (req, res) => {
  try {
    const { email, password, fullName, phone, emergencyContacts } = req.body || {};

    if (!isEmail(email)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be between 6 and 128 characters.' });
    }
    const nameResult = requireString(fullName, { field: 'Full name', min: 2, max: 80 });
    if (nameResult.error) return res.status(400).json({ error: nameResult.error });
    if (!isPhone(phone)) {
      return res.status(400).json({ error: 'A valid phone number is required.' });
    }

    const contactsResult = normaliseEmergencyContacts(emergencyContacts);
    if (!contactsResult.valid) {
      return res.status(400).json({ error: contactsResult.error });
    }

    const userRecord = await auth.createUser({
      email: email.trim(),
      password,
      displayName: nameResult.value,
    });

    const userData = {
      userId: userRecord.uid,
      email: email.trim(),
      fullName: nameResult.value,
      role: 'student',
      phone: phone.trim(),
      emergencyContacts: contactsResult.contacts,
      createdAt: new Date().toISOString(),
      pushToken: null,
    };

    await db.ref(`users/${userRecord.uid}`).set(userData);

    res.status(201).json({
      message: 'User registered successfully.',
      userId: userRecord.uid,
    });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Email already registered.' });
    }
    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    log.error('auth.register_failed', { err: error });
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

/**
 * Get user profile
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.ref(`users/${userId}`).once('value');
    const userData = snapshot.val();

    if (!userData) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Don't send device/location internals
    const { pushToken, fcmToken, lastLatitude, lastLongitude, ...profile } = userData;
    res.json(profile);
  } catch (error) {
    log.error('auth.get_profile_failed', { err: error });
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { fullName, phone, emergencyContacts } = req.body || {};

    const updates = {};

    const nameResult = optionalString(fullName, { field: 'Full name', min: 2, max: 80 });
    if (nameResult.error) return res.status(400).json({ error: nameResult.error });
    if (nameResult.value !== undefined) updates.fullName = nameResult.value;

    if (phone !== undefined) {
      if (!isPhone(phone)) {
        return res.status(400).json({ error: 'A valid phone number is required.' });
      }
      updates.phone = phone.trim();
    }

    if (emergencyContacts !== undefined) {
      const contactsResult = normaliseEmergencyContacts(emergencyContacts);
      if (!contactsResult.valid) {
        return res.status(400).json({ error: contactsResult.error });
      }
      updates.emergencyContacts = contactsResult.contacts;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }

    await db.ref(`users/${userId}`).update(updates);
    if (updates.fullName) {
      await auth.updateUser(userId, { displayName: updates.fullName }).catch(() => {});
    }
    res.json({ message: 'Profile updated successfully.' });
  } catch (error) {
    log.error('auth.update_profile_failed', { err: error });
    res.status(500).json({ error: 'Failed to update profile.' });
  }
};

/**
 * Register (or clear, with null) the device push token for this user.
 */
const updatePushToken = async (req, res) => {
  try {
    const userId = req.user.uid;
    const body = req.body || {};
    const token = body.pushToken !== undefined ? body.pushToken : body.fcmToken;

    if (token !== null && (typeof token !== 'string' || token.length === 0 || token.length > 4096)) {
      return res.status(400).json({ error: 'pushToken must be a non-empty string or null.' });
    }

    await db.ref(`users/${userId}`).update({ pushToken: token, fcmToken: null });
    res.json({ message: 'Push token updated.' });
  } catch (error) {
    log.error('auth.push_token_failed', { err: error });
    res.status(500).json({ error: 'Failed to update push token.' });
  }
};

/**
 * Opt-in presence for nearby safety alerts. Stored in a separate `presence`
 * node (rounded coordinates + timestamp only) so nearby-user scans never
 * touch the profile node that holds names and phone numbers.
 */
const updateLocation = async (req, res) => {
  try {
    const userId = req.user.uid;
    const coords = parseLatLng(req.body?.latitude, req.body?.longitude);
    if (!coords) {
      return res.status(400).json({ error: 'Valid latitude and longitude are required.' });
    }

    await db.ref(`presence/${userId}`).set({
      lat: roundCoord(coords.latitude),
      lng: roundCoord(coords.longitude),
      updatedAt: new Date().toISOString(),
    });
    res.json({ message: 'Location updated.' });
  } catch (error) {
    log.error('auth.location_update_failed', { err: error });
    res.status(500).json({ error: 'Failed to update location.' });
  }
};

/**
 * Stop sharing presence (user turned the toggle off).
 */
const clearLocation = async (req, res) => {
  try {
    await db.ref(`presence/${req.user.uid}`).remove();
    res.json({ message: 'Location sharing stopped.' });
  } catch (error) {
    log.error('auth.location_clear_failed', { err: error });
    res.status(500).json({ error: 'Failed to clear location.' });
  }
};

/**
 * Admin only: change another user's role. Also sets the `role` custom claim so
 * requireRole can authorise from the ID token without a DB read.
 */
const updateUserRole = async (req, res) => {
  try {
    const { uid } = req.params;
    const { role } = req.body || {};

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}.` });
    }
    if (uid === req.user.uid) {
      return res.status(400).json({ error: 'You cannot change your own role.' });
    }

    const ref = db.ref(`users/${uid}`);
    const snapshot = await ref.once('value');
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await auth.setCustomUserClaims(uid, { role });
    await ref.update({ role, roleUpdatedAt: new Date().toISOString(), roleUpdatedBy: req.user.uid });
    log.info('auth.role_updated', { uid, role, by: req.user.uid });

    res.json({ message: `Role updated to ${role}.`, uid, role });
  } catch (error) {
    log.error('auth.update_role_failed', { err: error });
    res.status(500).json({ error: 'Failed to update role.' });
  }
};

module.exports = {
  register,
  getProfile,
  updateProfile,
  updatePushToken,
  updateLocation,
  clearLocation,
  updateUserRole,
};
