// Create an admin or security user for the Campus Safety dashboard.
//
// Usage:
//   node backend/scripts/create-admin.js <email> <password> "<full name>" [role]
//
// role defaults to "admin". Use "security" to create a security officer
// account instead. Both roles unlock the dashboard tab.
//
// The role is stored in users/{uid}/role AND as a custom claim on the Firebase
// Auth user, so the API can authorise from the ID token alone.
//
// Examples:
//   node backend/scripts/create-admin.js admin@campus.local Pass1234 "Campus Admin"
//   node backend/scripts/create-admin.js officer1@campus.local Pass1234 "Officer One" security

const { auth, db } = require('../config/firebase');

const VALID_ROLES = ['admin', 'security'];

const main = async () => {
  const [, , email, password, fullName, roleArg] = process.argv;
  const role = roleArg || 'admin';

  if (!email || !password || !fullName) {
    console.error('Usage: node backend/scripts/create-admin.js <email> <password> "<full name>" [admin|security]');
    process.exit(1);
  }
  if (!VALID_ROLES.includes(role)) {
    console.error(`Invalid role "${role}". Must be one of: ${VALID_ROLES.join(', ')}`);
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('Password must be at least 6 characters.');
    process.exit(1);
  }

  try {
    let userRecord;
    try {
      userRecord = await auth.createUser({ email, password, displayName: fullName });
      console.log(`Created Firebase Auth user ${userRecord.uid}`);
    } catch (err) {
      if (err.code !== 'auth/email-already-exists') throw err;
      userRecord = await auth.getUserByEmail(email);
      await auth.updateUser(userRecord.uid, { password, displayName: fullName });
      console.log(`User already existed — updated password on uid ${userRecord.uid}`);
    }

    await auth.setCustomUserClaims(userRecord.uid, { role });

    const existing = (await db.ref(`users/${userRecord.uid}`).once('value')).val() || {};
    const userData = {
      userId: userRecord.uid,
      email,
      fullName,
      role,
      phone: existing.phone || '',
      emergencyContacts: existing.emergencyContacts || [],
      createdAt: existing.createdAt || new Date().toISOString(),
      pushToken: existing.pushToken || null,
    };

    await db.ref(`users/${userRecord.uid}`).update(userData);

    console.log('\n✓ Done.');
    console.log(`  email: ${email}`);
    console.log(`  role:  ${role}`);
    console.log(`  uid:   ${userRecord.uid}`);
    console.log('\nThe user must sign out and back in for the new role to take effect.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin user:', err.message || err);
    process.exit(1);
  }
};

main();
