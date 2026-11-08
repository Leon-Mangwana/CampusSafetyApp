# Privacy notice — Campus Safety App

_Last updated: 8 November 2026. Replace the contact details below before publishing._

The Campus Safety App is run by Midlands State University Campus Security for students and staff
of the Gweru campus. This notice explains what the app stores, who can see it and for how long.

## What we store and why

| Data | Why | Who can see it | Kept for |
|---|---|---|---|
| Account: name, university email, phone number, emergency contacts (name + phone) | To sign you in and to reach you or your contacts during an SOS | You; campus security and administrators | Until you ask for your account to be deleted |
| Incident reports: type, description, time, exact location | To let security respond and to build the campus heatmap | **Exact location and description: security and administrators only.** Other students see only zones of about 55 m that contain two or more reports from the last 90 days | Indefinitely, as anonymous statistics (reports are never linked to your account) |
| SOS alerts: your name, phone, live location while the alert is active | To get help to you | Campus security and administrators | Alerts are closed when resolved and deleted 90 days later |
| Approximate location (optional, off by default) | To warn you about serious incidents within 500 m | Nobody sees it. The server uses it only to pick who receives an alert | Deleted after 24 hours; stops immediately when you turn the setting off |
| Push notification token | To deliver alerts to your phone | Server only | Removed when you sign out or turn alerts off |
| In-app notifications | To show you SOS responses and incident alerts | You | 60 days |

Incident reports are **anonymous**: the app does not store who submitted a report.

## What we do not do

- We do not track your location in the background. Approximate location sharing works only while
  the app is open, only if you turn it on, and is rounded to about 10 m.
- We do not sell or share data with third parties. Push notifications are delivered through Expo's
  push service, and map tiles are loaded from OpenStreetMap; neither receives your identity or the
  contents of a report.
- Server logs never contain names, phone numbers, emails or coordinates.

## Security

Data is stored in Google Firebase (encrypted at rest) and transferred over TLS. The database
cannot be read or written by the app directly; every request goes through our server, which checks
your identity and role. Security staff accounts are created by administrators only.

## Your choices

- Turn **Safety alerts** or **Share approximate location** on or off in Settings at any time.
- Edit your name, phone number and emergency contacts in Settings.
- To delete your account and personal data, email the address below. Anonymous incident statistics
  are retained.

## Contact

Campus Security, Midlands State University — _add email and phone before publishing_.
