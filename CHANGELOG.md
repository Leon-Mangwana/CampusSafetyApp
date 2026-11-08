# Changelog

## Unreleased — deployment hardening

### Security
- Self-registration always creates a `student`; the `role` field in the request is ignored. Roles are
  changed only via `create-admin` or the new admin-only `PUT /api/auth/users/:uid/role`, which also
  sets a Firebase custom claim.
- Realtime Database rules now deny all client reads and writes (the backend uses the Admin SDK).
  Previously any signed-in user could promote themselves to admin and rewrite every incident, SOS
  alert and notification.
- Rate limits are keyed by user id instead of IP address, so shared campus Wi-Fi can no longer lock
  out every student after three SOS alerts. Failed SOS requests do not count against the limit.
- `markAsRead` checks notification ownership. Raw incident records are staff-only.
- Server-side input validation for every endpoint (coordinates, lengths, emails, phones); body limit
  reduced from 10 MB to 100 kB; CORS restricted to `CORS_ORIGINS`.
- Removed the unused Google Maps API key from `app.json` and the unused `react-native-maps`,
  `jsonwebtoken` and `bcryptjs` dependencies. **The key must still be rotated in Google Cloud.**
- Logout now ends the Firebase session; a 401 from the API signs the user out.

### SOS correctness
- Press-and-hold fires after a true 3 seconds (was 1 second).
- An SOS without GPS is sent anyway with `locationStatus: none` instead of a hard-coded campus point;
  the dashboard and tracker show a "call the student" fallback and the student's phone number.
- Retry re-acquires GPS and resends; 4xx errors other than 408/429 are not retried.
- `tel:911` replaced by Zimbabwe numbers (Police 995, Ambulance 994, Fire 993, General 999) and a
  configurable campus control-room number.
- Push notifications now actually work: Expo push tokens are registered after login and the backend
  sends via `expo-server-sdk`; dead tokens are pruned. Officers are pushed for SOS/incidents,
  students are pushed when security responds, and taps deep-link to the tracker.
- Login aborts if the profile cannot be loaded instead of silently assuming `student`.

### Privacy
- Students receive heatmap and statistics as ~55 m grid cells with at least two reports from the last
  90 days; staff may request full precision. Severity is computed on the server.
- Nearby-incident alerts use an opt-in `presence` node (rounded coordinates, 2-hour freshness) instead
  of scanning every user profile. New Settings toggles for alerts and location sharing.
- Structured JSON logging with redaction of names, phones, emails, coordinates and tokens.
- Coordinates removed from notification text and from student-facing screens.
- Leaflet pinned with Subresource Integrity; WebView navigation locked to the inline document.
- `scripts/purge.js` implements retention (SOS 90 d, notifications 60 d, presence 24 h).

### Performance
- Indexed, bounded Realtime Database queries (status/timestamp windows, `limitToLast`) replace
  whole-table scans.
- `usePolling` pauses polling when a tab is unfocused or the app is backgrounded; intervals relaxed
  (heatmap 30 s, notifications 30 s, monthly report 60 s, dashboard 10 s / 3 s during an SOS).
- Dashboard lists use `FlatList`; auth context value is memoised; reverse-geocode cache has a TTL.

### Architecture
- Shared `LeafletMap`, `Badge`, `ErrorState`, `PlaceLabel` components; `useSOS` hook; dashboard and
  SOS screens split into small files. All demo/sample data fallbacks removed.
- Backend `notifyOfficers`, `hotspots`, `validate`, `logger` utilities; `asyncHandler`.

### Tooling
- ESLint 9 + Prettier for both packages, Jest suites (backend with supertest against an in-memory
  Firebase fake; mobile with jest-expo), GitHub Actions CI, root scripts, `check:shared` and
  `check:rules` guards.
- README rewritten; new `docs/DEPLOYMENT.md` and `docs/PRIVACY.md`; user manual updated.
