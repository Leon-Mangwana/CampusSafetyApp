# Deployment guide

This covers taking the app from a laptop to real students. Work through the sections in order.

## 1. Firebase project

1. Enable **Realtime Database** and **Authentication → Email/Password**.
2. In Authentication → Settings, turn on **email enumeration protection**.
3. Create a service account (Project settings → Service accounts → Generate new private key) and
   copy `project_id`, `private_key`, `client_email` into the backend `.env`.
4. Deploy the database rules. They deny all client access; only the backend (Admin SDK) reads or
   writes:
   ```bash
   firebase login
   firebase use campus-safety-app-a4936   # or edit .firebaserc
   npm run deploy:rules
   ```
   Verify with a student ID token:
   `curl "https://<db>.firebaseio.com/users/<uid>.json?auth=<idToken>"` must return
   `{"error":"Permission denied"}`.

## 2. Backend hosting

Any Node 20 host works (a small VM, Render, Railway, Fly.io, Cloud Run). Requirements:

- **TLS** terminated either by the platform/reverse proxy (recommended) or by the app itself via
  `HTTPS_KEY_PATH` / `HTTPS_CERT_PATH` (TLS 1.3 only).
- `app.set('trust proxy', 1)` is already configured; keep exactly one proxy hop in front.
- Environment (see `backend/.env.example`):

  | Variable | Purpose |
  |---|---|
  | `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_DATABASE_URL` | Admin SDK credentials |
  | `PORT` | listen port (default 3000) |
  | `CORS_ORIGINS` | comma-separated browser origins; native apps need none |
  | `LOG_LEVEL` | `debug` / `info` (default) / `warn` / `error` |

- Logs are JSON lines on stdout/stderr with personal data redacted; ship them to your platform's
  log viewer.
- Health check: `GET /api/health`.

## 3. Staff accounts

```bash
cd backend
npm run create-admin -- admin@msu.ac.zw 'StrongPass' 'Campus Admin'
npm run create-admin -- control@msu.ac.zw 'StrongPass' 'Control Room' security
```

Roles are stored both in the database and as a Firebase custom claim. Accounts created before this
version need `node scripts/backfill-claims.js`. Admins can later change roles with
`PUT /api/auth/users/:uid/role` (`{"role":"security"}`). Staff must sign out and back in after a
role change.

## 4. Push notifications (Expo Push Service)

1. Create an EAS project (already referenced in `mobile/app.json → extra.eas.projectId`).
2. Upload the Firebase **FCM V1 service account** to EAS once: `eas credentials` → Android →
   Google Service Account Key → upload the same JSON used for the backend (or a dedicated one).
3. Build a development or production app. **Expo Go on Android cannot receive push notifications**
   (SDK 53+). iOS push needs an Apple Developer account and APNs key via `eas credentials`.
4. Tokens are registered automatically after login when **Safety alerts** is on. Dead tokens
   reported by Expo are removed from the database automatically.

## 5. Mobile release

1. Set the control-room number in `mobile/src/constants/emergencyNumbers.js` and confirm the
   national numbers.
2. Set `EXPO_PUBLIC_API_URL=https://<your-api-host>/api` in the EAS build profile (`eas.json` →
   `build.production.env`) or a `.env` file. A production bundle without it refuses to start.
3. Bump `version` in `mobile/app.json`.
4. `eas build --profile production --platform android` (and `ios` if applicable).
5. Google Play requires a **privacy policy URL**; publish `docs/PRIVACY.md` and declare the
   location permission ("safety alerts for nearby incidents, foreground only").

## 6. Retention cron

Run daily, e.g. `0 3 * * *`:

```bash
cd /srv/campus-safety/backend && node scripts/purge.js
```

Defaults: closed SOS alerts after 90 days, notifications after 60 days, presence after 24 hours.
Override with `SOS_RETENTION_DAYS`, `NOTIFICATION_RETENTION_DAYS`, `PRESENCE_RETENTION_HOURS`.
Use `--dry-run` first.

## 7. Release checklist

- [ ] Database rules deployed and verified to deny client access
- [ ] Backend reachable over HTTPS; `/api/health` returns `tls: enabled` or proxy terminates TLS
- [ ] At least one admin and the control-room security account created, claims set
- [ ] FCM service account uploaded to EAS; push tested on two real Android devices (student → officer)
- [ ] Control-room number and national emergency numbers confirmed by the owner
- [ ] `EXPO_PUBLIC_API_URL` set in the production build profile
- [ ] Privacy policy URL live and linked in the store listing
- [ ] Purge cron scheduled
- [ ] The leaked Google Maps API key from earlier commits deleted/rotated in Google Cloud Console
- [ ] `npm run lint && npm test` green on `main`
