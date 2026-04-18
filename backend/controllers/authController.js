const { auth, db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

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
    const name = typeof c.name === 'string' ? c.name.trim() : '';
    const phone = typeof c.phone === 'string' ? c.phone.trim() : '';
    if (!name || !phone) {
      return { valid: false, error: 'Each emergency contact needs a name and phone number.' };
    }
    contacts.push({ name, phone });
  }
  return { valid: true, contacts };
};

/**
 * Register a new user
 */
const register = async (req, res) => {
  try {
    const { email, password, fullName, phone, emergencyContacts, role } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'A valid email address is required.',
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    if (!fullName || !phone) {
      return res.status(400).json({ error: 'Full name and phone number are required.' });
    }

    const contactsResult = normaliseEmergencyContacts(emergencyContacts);
    if (!contactsResult.valid) {
      return res.status(400).json({ error: contactsResult.error });
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: fullName,
    });

    // Store additional user data in Realtime Database
    const userData = {
      userId: userRecord.uid,
      email,
      fullName,
      role: role || 'student',
      phone,
      emergencyContacts: contactsResult.contacts,
      createdAt: new Date().toISOString(),
      fcmToken: null,
      lastLatitude: null,
      lastLongitude: null,
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
    console.error('Registration error:', error);
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

    // Don't send sensitive fields
    const { fcmToken, ...profile } = userData;
    res.json(profile);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { fullName, phone, emergencyContacts } = req.body;

    const updates = {};
    if (fullName) updates.fullName = fullName;
    if (phone) updates.phone = phone;

    if (emergencyContacts !== undefined) {
      const contactsResult = normaliseEmergencyContacts(emergencyContacts);
      if (!contactsResult.valid) {
        return res.status(400).json({ error: contactsResult.error });
      }
      updates.emergencyContacts = contactsResult.contacts;
    }

    await db.ref(`users/${userId}`).update(updates);
    res.json({ message: 'Profile updated successfully.' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
};

/**
 * Update FCM token for push notifications
 */
const updateFcmToken = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { fcmToken } = req.body;

    await db.ref(`users/${userId}`).update({ fcmToken });
    res.json({ message: 'FCM token updated.' });
  } catch (error) {
    console.error('FCM token update error:', error);
    res.status(500).json({ error: 'Failed to update FCM token.' });
  }
};

/**
 * Update user's last known location
 */
const updateLocation = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { latitude, longitude } = req.body;

    await db.ref(`users/${userId}`).update({
      lastLatitude: latitude,
      lastLongitude: longitude,
    });
    res.json({ message: 'Location updated.' });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({ error: 'Failed to update location.' });
  }
};

module.exports = { register, getProfile, updateProfile, updateFcmToken, updateLocation };
