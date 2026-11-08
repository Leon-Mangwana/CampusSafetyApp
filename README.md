# Campus Safety Application

A mobile app for Midlands State University (Gweru, Zimbabwe) that lets students report incidents
anonymously, see a privacy-preserving campus heatmap, and raise an SOS that reaches campus security
with live location. Security officers get a dashboard, live SOS tracking, push alerts and monthly
reports.

- **Mobile**: Expo SDK 55 / React Native, React Navigation 7, Leaflet (OpenStreetMap) in a WebView
- **Backend**: Node 20 / Express 5, Firebase Realtime Database + Firebase Auth (Admin SDK), Expo Push
- **Tooling**: ESLint 9, Prettier, Jest (+ supertest / jest-expo), GitHub Actions

## Repository layout

```
CampusSafetyApp/
├── backend/                 # Express API (the only thing that talks to the database)
│   ├── controllers/         # auth, incidents, SOS, notifications
│   ├── middleware/          # Firebase ID-token auth, roles, per-user rate limits
│   ├── routes/
│   ├── utils/               # validation, logger (PII-redacting), hotspots, push, classifier
│   ├── scripts/             # create-admin, backfill-claims, purge, check-shared-sync
│   ├── test/                # Jest + supertest against an in-memory Firebase fake
│   └── database.rules.json  # client access is fully locked (.read/.write false)
├── mobile/
│   ├── src/screens/         # one folder per complex screen (dashboard/, sos/)
│   ├── src/components/      # LeafletMap, Badge, ErrorState, PlaceLabel, …
│   ├── src/hooks/           # usePolling (focus + foreground aware), useRelativeTime
│   ├── src/context/         # AuthContext, DevicePrefsContext (push + location consent)
│   └── src/services/        # api (timeouts, ApiError), push, presence, firebase
├── docs/                    # DEPLOYMENT.md, PRIVACY.md
├── firebase.json            # points `firebase deploy --only database` at the rules file
└── .github/workflows/ci.yml
```

## How it works

- Every write goes through the backend with the Firebase **Admin SDK**. The Realtime Database rules
  deny all client reads and writes, so the public Firebase web config in the app grants nothing.
- The API verifies Firebase **ID tokens**. Roles (`student`, `security`, `admin`) come from a custom
  claim on the token, falling back to `users/{uid}/role`. Self-registration always creates a
  student; staff are created with `npm run create-admin` or `PUT /api/auth/users/:uid/role`.
- **Severity** is computed on the server from the description (`utils/severityClassifier.js`); the
  mobile copy is only a live preview, and CI fails if the two copies drift.
- **SOS** is never rejected for lack of GPS. The alert carries `locationStatus` (`gps`,
  `last_known`, `none`) and the dashboard shows a "call the student" fallback.
- **Privacy**: students only ever receive heatmap/statistics cells of ~55 m that aggregate two or
  more reports from the last 90 days. Raw incidents are staff-only. Logs are structured JSON with
  names, phones, emails and coordinates redacted. See [docs/PRIVACY.md](docs/PRIVACY.md).
- **Rate limits** are per user id (campus Wi-Fi shares one IP): 3 SOS / 5 min, 10 reports / 10 min.
- **Push** uses the Expo Push Service (`expo-notifications` + `expo-server-sdk`). Android needs an
  EAS build with FCM credentials; Expo Go on Android cannot receive push.

## Prerequisites

- Node.js 20+
- A Firebase project with **Realtime Database** and **Email/Password Authentication** enabled
- Firebase CLI (`npm i -g firebase-tools`) for deploying database rules
- EAS CLI (`npm i -g eas-cli`) for device builds; Expo Go is fine for most development

## Backend

```bash
cd backend
npm install
cp .env.example .env      # fill in the Firebase service-account values
npm run dev               # http://localhost:3000/api/health
```

Deploy the database rules once (and after every change):

```bash
firebase login
npm run deploy:rules      # from backend/ or the repo root
```

Create the first admin and a security officer:

```bash
npm run create-admin -- admin@msu.ac.zw 'StrongPass1' 'Campus Admin'
npm run create-admin -- officer1@msu.ac.zw 'StrongPass1' 'Officer One' security
```

Other scripts: `npm test`, `npm run lint`, `node scripts/backfill-claims.js` (existing staff),
`node scripts/purge.js --dry-run` (retention).

## Mobile

```bash
cd mobile
npm install
npx expo start
```

In development the app derives the API host from the Expo dev server, so the backend just needs to
run on port 3000 on the same machine. For release builds set `EXPO_PUBLIC_API_URL`
(see `mobile/.env.example`); a production bundle without it refuses to start.

Before shipping, edit `mobile/src/constants/emergencyNumbers.js`: set the MSU security control room
number and confirm the national numbers (Police 995, Ambulance 994, Fire 993, General 999).

Build for devices:

```bash
eas credentials            # upload the FCM service account once (Android push)
eas build --profile preview --platform android
```

## Quality gates

From the repository root:

```bash
npm run lint          # backend + mobile ESLint
npm test              # backend Jest (supertest) + mobile Jest (jest-expo)
npm run check:shared  # classifier copies identical
npm run check:rules   # firebase.json → rules file, root rules locked
```

The same checks run in GitHub Actions on every push and pull request.

## Documentation

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): hosting, TLS, environment, cron, release checklist
- [docs/PRIVACY.md](docs/PRIVACY.md): what is stored, who can see it, retention
- [USER_MANUAL.md](USER_MANUAL.md): end-user guide for students and security staff
- [CHANGELOG.md](CHANGELOG.md)

## License

Open source for academic and educational purposes.
