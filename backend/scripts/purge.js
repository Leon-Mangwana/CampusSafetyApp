// Data retention: removes old records so personal data is not kept forever.
//
//   node backend/scripts/purge.js            # apply
//   node backend/scripts/purge.js --dry-run  # report only
//
// Defaults (override with env vars):
//   SOS_RETENTION_DAYS=90          closed/responded SOS alerts older than this
//   NOTIFICATION_RETENTION_DAYS=60 notifications older than this
//   PRESENCE_RETENTION_HOURS=24    presence records not updated within this
//
// Run daily from cron, e.g.  0 3 * * *  cd /srv/campus-safety/backend && node scripts/purge.js

const { db } = require('../config/firebase');

const dryRun = process.argv.includes('--dry-run');
const days = (n) => n * 24 * 60 * 60 * 1000;
const hours = (n) => n * 60 * 60 * 1000;

const SOS_RETENTION_MS = days(Number(process.env.SOS_RETENTION_DAYS) || 90);
const NOTIFICATION_RETENTION_MS = days(Number(process.env.NOTIFICATION_RETENTION_DAYS) || 60);
const PRESENCE_RETENTION_MS = hours(Number(process.env.PRESENCE_RETENTION_HOURS) || 24);

const olderThan = (iso, ms) => {
  const t = new Date(iso || 0).getTime();
  return !Number.isFinite(t) || Date.now() - t > ms;
};

const purgeNode = async (path, shouldDelete) => {
  const snapshot = await db.ref(path).once('value');
  const updates = {};
  snapshot.forEach((child) => {
    if (shouldDelete(child.val() || {})) updates[`${path}/${child.key}`] = null;
  });
  const count = Object.keys(updates).length;
  if (count > 0 && !dryRun) await db.ref().update(updates);
  return count;
};

const main = async () => {
  const sos = await purgeNode('sosAlerts', (a) =>
    a.status !== 'active' && olderThan(a.resolvedAt || a.cancelledAt || a.timestamp, SOS_RETENTION_MS));
  const notifications = await purgeNode('notifications', (n) =>
    olderThan(n.timestamp, NOTIFICATION_RETENTION_MS));
  const presence = await purgeNode('presence', (p) =>
    olderThan(p.updatedAt, PRESENCE_RETENTION_MS));

  console.log(`${dryRun ? '[dry-run] would remove' : 'Removed'}: ${sos} SOS alerts, ${notifications} notifications, ${presence} presence records.`);
  process.exit(0);
};

main().catch((err) => {
  console.error('Purge failed:', err.message || err);
  process.exit(1);
});
