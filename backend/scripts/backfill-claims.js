// One-off migration: copy users/{uid}/role into a Firebase Auth custom claim
// for every security/admin account so requireRole can authorise from the ID
// token without a database read. Safe to re-run.
//
//   node backend/scripts/backfill-claims.js

const { auth, db } = require('../config/firebase');

const main = async () => {
  const snapshot = await db.ref('users').once('value');
  let updated = 0;
  let skipped = 0;
  const jobs = [];
  snapshot.forEach((child) => {
    const role = child.val()?.role;
    if (role !== 'security' && role !== 'admin') {
      skipped++;
      return;
    }
    jobs.push(
      auth.setCustomUserClaims(child.key, { role })
        .then(() => { updated++; })
        .catch((err) => console.error(`  ${child.key}: ${err.message}`))
    );
  });
  await Promise.all(jobs);
  console.log(`Claims set for ${updated} staff accounts (${skipped} students skipped).`);
  console.log('Staff must sign out and back in for the claim to appear in their token.');
  process.exit(0);
};

main().catch((err) => {
  console.error('Backfill failed:', err.message || err);
  process.exit(1);
});
