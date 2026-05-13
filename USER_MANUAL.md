# Appendix A: User Manual

> **Formatting note for the document author:** when pasting into Word, set the
> entire appendix to Times New Roman 12 pt, justified, 1.5 line spacing. Apply
> bold (not underline) to all numbered headings as per the HCSE236 guideline.
> Figure captions go *below* figures; table captions go *above* tables.
> Replace every `[Insert Figure A.N here]` marker with the relevant screenshot
> from the running application before binding.

---

## A.1 Introduction

This user manual provided step-by-step guidance for the operation of the
Crowdsourced Campus Safety Application (CCSA). The application served two
distinct categories of users — **students** and **campus security / system
administrators** — and the manual was therefore divided into role-specific
sections after a common installation and account-setup section. The manual
assumed that the reader had basic familiarity with a smartphone running
Android 8.0 or later, or iOS 13 or later, and that the reader had access to
the internet during application use.

---

## A.2 System Requirements

The following minimum requirements were established for successful operation
of the CCSA on an end-user device.

**Table A.1: Minimum device requirements for the CCSA.**

| Requirement | Minimum specification |
|---|---|
| Operating system | Android 8.0 (Oreo) or iOS 13.0 |
| Free storage | 200 MB |
| RAM | 2 GB |
| Network | Active Wi-Fi or mobile data (3G/4G/5G) |
| GPS | Hardware GPS enabled and permission granted |
| Display | 4.5-inch screen or larger |
| Other | Expo Go application installed (see §A.3) |

---

## A.3 Getting Started — Installing the Application

The CCSA was distributed during the project defence period through the
**Expo Go** runtime, which allowed the development bundle to be loaded onto
any compatible smartphone without requiring a Google Play Store or App Store
publication. The following steps installed and launched the application.

### A.3.1 Installing Expo Go

1. The user opened the **Google Play Store** (on Android) or the **App Store**
   (on iOS) on their smartphone.
2. The user searched for the application named **"Expo Go"** and tapped
   **Install**.
3. After installation completed, the user opened Expo Go once and accepted
   any first-run prompts.

*[Insert Figure A.1 here]*

**Figure A.1:** The Expo Go application page on the Google Play Store.

### A.3.2 Loading the Campus Safety Application

1. The project supervisor or developer started the application's development
   server by executing the command `npx expo start` from the project's
   `mobile` directory. A QR code was then displayed in the terminal and in
   the browser-based developer console.
2. The user opened **Expo Go** on their smartphone and tapped **Scan QR
   code**.
3. The user pointed the device's rear camera at the QR code displayed on
   the developer's computer screen.
4. Expo Go automatically downloaded the JavaScript bundle and launched the
   Campus Safety Application. The first launch took approximately 10–30
   seconds depending on network speed.

*[Insert Figure A.2 here]*

**Figure A.2:** Expo Go QR code scanner interface used to load the CCSA.

> **Note:** the smartphone and the developer's computer were required to be
> connected to the same Wi-Fi network for the QR code load to succeed. If
> they were on different networks, the developer used the **tunnel** option
> in Expo's developer console to provide a publicly reachable URL.

### A.3.3 Granting Permissions

On first launch, the CCSA requested the following device permissions:

1. **Location (while using the app):** required so that incident reports
   and SOS alerts carried accurate GPS coordinates.
2. **Notifications:** required so that security officers received SOS
   alerts and students received status-change updates.

The user tapped **Allow** on each permission prompt. If a permission was
accidentally denied, it could later be re-enabled from the device's
**Settings → Apps → Expo Go → Permissions** menu.

---

## A.4 Account Setup

### A.4.1 Creating a Student Account

New students created an account directly from the application. The
following procedure was used.

1. On the **Sign In** screen, the user tapped **Create New Student Account**
   at the bottom.
2. The user filled in the following fields on the **Create Account** screen:
   - **Full Name:** letters, spaces, hyphens, and apostrophes only — no
     numbers were accepted.
   - **University Email:** a valid email address in the form
     `name@university.ac.zw` or similar.
   - **Phone Number:** a Zimbabwe mobile number in any of the formats
     `+263 77 123 4567`, `077 123 4567`, or `77 123 4567`.
   - **Emergency Contacts:** the user entered the **name** and **phone
     number** of at least three trusted contacts who would receive an SMS
     alert during an SOS event.
   - **Password:** at least six characters. Tapping the eye icon (👁)
     toggled the password's visibility.
   - **Confirm Password:** the same password re-typed.
3. If any field was invalid, a red error message appeared directly beneath
   that field and the form refused to submit until the error was corrected.
4. The user tapped **Create Account**. On success, the user was
   automatically signed in and taken to the **Home** screen.

*[Insert Figure A.3 here]*

**Figure A.3:** The Create Account form with inline validation errors
displayed in red.

### A.4.2 Signing In

Returning users signed in as follows.

1. The user launched the application via Expo Go (see §A.3.2).
2. At the **Sign In** screen, the user selected the appropriate role tab:
   **Login as Student** or **Login as Admin**.
3. The user entered their registered **email** and **password**.
4. The user tapped **Sign In as Student** (or **Sign In as Admin**).
5. The application validated the credentials with Firebase Authentication
   and routed the user to the role-appropriate home screen — the **Home**
   screen for students or the **Security Dashboard** for admins.

*[Insert Figure A.4 here]*

**Figure A.4:** The Sign In screen with role toggle.

### A.4.3 Recovering a Forgotten Password

1. On the **Sign In** screen the user tapped **Forgot Password?**.
2. The user entered the email address associated with their account.
3. The user tapped **Send Reset Link**. A password-reset email was sent
   by Firebase to that address within approximately one minute.
4. The user opened the email, tapped the reset link, set a new password
   in the browser page that opened, and then returned to the application
   to sign in normally.

---

## A.5 Student User Guide

### A.5.1 Home Screen Overview

After a successful student sign-in, the **Home** screen presented a
greeting banner, a prominent red **Emergency Alert** card, two
quick-action cards (**Report Incident** and **Campus Heatmap**), two
resource cards (**Emergency Numbers** and **Safety Statistics**), and a
daily rotating safety tip.

*[Insert Figure A.5 here]*

**Figure A.5:** The student Home screen showing the SOS card and quick
actions.

### A.5.2 Reporting an Incident

The incident-report workflow was designed to be completable in under
sixty seconds in line with Objective 1.5.1 of the project.

1. From the **Home** screen the student tapped the **Report Incident**
   card, or alternatively navigated through any screen offering that
   shortcut.
2. The student selected an **Incident Type** from the horizontal chip
   list (Theft, Assault, Harassment, Vandalism, Unauthorized Access,
   Fire, Medical, Suspicious Activity, Other).
3. The student typed a **Description** of the incident in English. The
   description was required to be at least ten characters and to use
   the English language; non-English text was rejected with an
   on-screen error.
4. As the student typed, the **Detected Severity** badge below the
   description updated automatically in real time, displaying *Low*,
   *Medium*, or *High* based on the chosen incident type and the
   keywords detected in the description. The student was not required
   to select severity manually.
5. The application captured the student's GPS location automatically
   and displayed the coordinates in the **Location** box. The student
   could tap **Refresh** to update the fix.
6. The student tapped **Submit Report Anonymously**. A confirmation
   dialog appeared and the student was returned to the previous screen.

*[Insert Figure A.6 here]*

**Figure A.6:** The Report Incident form showing the automatically
detected severity badge.

### A.5.3 Triggering an SOS Alert

The SOS feature was the highest-priority safety mechanism in the
application. It transmitted the student's live GPS coordinates to
campus security and to the three registered emergency contacts.

1. From the **Home** screen the student tapped the red **Emergency
   Alert** card. The **Emergency SOS** screen appeared.
2. The student **pressed and held** the large red **SOS** button for
   three full seconds. A circular progress ring filled around the
   button to indicate the hold time remaining.
3. After the hold completed, the device vibrated and the screen turned
   solid red, displaying **SOS ACTIVE**. The application then
   simultaneously:
   - Recorded the alert on the backend server so it appeared on the
     Security Dashboard within three seconds.
   - Opened the device's SMS application with a pre-filled message
     containing the student's live Google Maps location, addressed
     to all three emergency contacts. The student tapped **Send** in
     the SMS application to dispatch the message.
4. While the SOS was active, the student's GPS coordinates were
   transmitted to the backend every three seconds, allowing campus
   security to track the student's movement in real time.

*[Insert Figure A.7 here]*

**Figure A.7:** The SOS Active screen showing the pulsing indicator,
live coordinates, and emergency-contact list.

### A.5.4 Cancelling an SOS Alert

If the SOS had been triggered in error, or if the situation had
resolved, the student cancelled the alert as follows.

1. On the **SOS Active** screen the student tapped **Cancel SOS** near
   the bottom.
2. A confirmation dialog asked the student to confirm.
3. The student tapped **Yes, Cancel**. The alert was closed on the
   server and the SOS Active screen was dismissed.

### A.5.5 Viewing the Campus Heatmap

The heatmap visualised aggregated incident reports as coloured circles
overlaid on an interactive campus map.

1. The student tapped the **Campus Heatmap** card on the Home screen or
   the **Map** tab in the bottom navigation bar.
2. The map displayed Low (green), Medium (orange), and High (red)
   severity circles whose size reflected report concentration.
3. The student could filter by incident type using the **Filter** chips
   (All, Theft, Assault, Harassment, Vandalism).
4. The **Locate Me** button (bottom-right) centred the map on the
   student's current GPS position.
5. The heatmap auto-refreshed every five seconds while the screen was
   open.

*[Insert Figure A.8 here]*

**Figure A.8:** The Campus Heatmap screen with severity circles and
filter chips.

### A.5.6 Viewing Safety Statistics

1. The student tapped **Safety Statistics** on the Home screen.
2. The screen displayed total-incident, resolution-rate, pending, and
   SOS-handled counts; a horizontal bar chart broken down by incident
   type; a severity distribution panel; and a ranked **Top Safety
   Hotspots** list.
3. The student tapped any hotspot row to open the heatmap zoomed in on
   the selected location with a red highlight marker.

### A.5.7 Notifications

1. The student tapped the **Alerts** tab in the bottom navigation bar.
2. The screen listed all notifications addressed to the student in
   reverse chronological order. Unread notifications were highlighted.
3. The student tapped **Mark all as read** to clear unread indicators.

### A.5.8 Settings and Emergency Contacts

1. The student tapped the **Settings** tab in the bottom navigation
   bar (or the gear icon in any screen header).
2. The screen allowed the student to:
   - Update their **full name** and **phone number**.
   - Edit their three **emergency contacts**.
   - Toggle **push notifications** on or off.
   - **Sign out** of the application.

---

## A.6 Security and Administrator User Guide

### A.6.1 Security Dashboard Overview

After a successful admin sign-in, the **Security Dashboard** was loaded
in place of the student Home screen. The dashboard auto-refreshed every
ten seconds, and accelerated to every three seconds while any SOS alert
was active.

The dashboard displayed:
- A row of summary statistics: **Total**, **Pending**, **Active SOS**,
  **Resolved**.
- An **Active SOS Alerts** section listing each open alert.
- A **Recent Incident Reports** section listing the most recent reports
  with status and severity badges.

*[Insert Figure A.9 here]*

**Figure A.9:** The Security Dashboard showing summary statistics and
active alerts.

### A.6.2 Responding to an Active SOS

Each active SOS alert appeared on the dashboard as a red-bordered card
displaying the **LIVE** indicator, the time since the last GPS update,
the user's name, the current GPS coordinates, and three action buttons.

1. The security officer reviewed the **LIVE — Updated X seconds ago**
   line to confirm the alert was still receiving location updates.
2. The officer tapped **Track Live** to enter the live tracker screen
   (see §A.6.3), or **Open in Maps** to open the location in the
   device's native maps application for navigation.
3. Once the officer had reached the student and the incident had been
   contained, the officer tapped **Mark Responded** to close the alert.
   A confirmation dialog appeared, and on confirmation the alert was
   removed from the active list.

### A.6.3 Live SOS Tracking

The **Live SOS Tracker** screen presented an interactive Leaflet map
that auto-followed the student's GPS pin in real time.

1. The officer tapped **Track Live** on any active SOS card on the
   dashboard.
2. The tracker screen opened, centred on the student's most recent
   coordinates. A red pulse marker indicated the student's position,
   and a dashed red trail showed the student's path since the alert
   began.
3. The header displayed a flashing **LIVE** badge and the relative
   time since the last GPS update (e.g. "Updated 2s ago").
4. The map panned automatically each time a new GPS fix arrived
   (approximately every three seconds).
5. The officer could tap **Open in Google Maps** to switch to
   turn-by-turn navigation, or **Mark Responded** to close the alert
   and return to the dashboard.

*[Insert Figure A.10 here]*

**Figure A.10:** The Live SOS Tracker screen showing the moving pin
and the trail of past positions.

### A.6.4 Managing Incident Reports

For each report listed in the **Recent Incident Reports** section, the
officer could perform the following actions.

1. **Open in Maps:** the officer tapped this button to open the
   incident location in the device's native maps app.
2. **Accept:** for a report with status *Pending*, this transitioned
   the report to *Active*, indicating that security had taken
   ownership of the case.
3. **Resolve:** this marked the report as completed and removed it
   from the pending count.
4. **Delete:** this permanently removed the report from the database.
   A confirmation dialog warned that the action was irreversible.

### A.6.5 Generating Monthly Reports

The application generated and exported a printable monthly summary
suitable for distribution to university management.

1. The administrator tapped the **Reports** tab in the bottom
   navigation bar.
2. The administrator selected the desired month and year using the
   navigation arrows at the top of the screen.
3. The screen displayed total incidents, resolution rate, top hotspot,
   and a month-on-month trend (improvement or increase percentage).
4. The administrator tapped **Export as PDF**. The application
   rendered a formatted PDF document and opened the device's standard
   share sheet, allowing the file to be emailed, saved to cloud
   storage, or sent over a messaging application.

*[Insert Figure A.11 here]*

**Figure A.11:** A generated Monthly Safety Report rendered as PDF.

---

## A.7 Troubleshooting

The following common issues were anticipated, and their resolutions
were documented for end users.

**Table A.2: Common issues and resolutions.**

| Issue | Resolution |
|---|---|
| The QR code in Expo Go failed to load the app. | The user verified that the phone and the developer machine were on the same Wi-Fi network. If they were not, the developer was asked to use the **tunnel** option in Expo's developer console. |
| The map screen displayed a blank grey area. | The user tapped the **Locate Me** button and confirmed that location permission had been granted in the device's settings. |
| An "SOS Error" alert appeared after triggering an SOS. | The user verified that the device had a stable internet connection and that they were signed in. They then re-triggered the SOS. The backend logged the error for follow-up by the system administrator. |
| The Security Dashboard appeared empty for an admin user. | The administrator pulled the dashboard down to refresh manually. If the empty state persisted, the backend service was either offline or the admin's session token had expired and required a re-sign-in. |
| The incident report refused to submit despite a complete form. | The user reviewed every field for red error text and addressed each error individually. The most frequent cause was a description shorter than ten characters or written in a non-English language. |
| The application crashed or froze. | The user closed Expo Go entirely from the device's recent-apps switcher and reopened it, then re-scanned the QR code. |
| Emergency-contact SMS messages were not sent. | The user verified that the SMS application opened automatically after the SOS was triggered, and that the user tapped **Send** within that application. The CCSA itself did not send the SMS — it only pre-filled the message. |

---

## A.8 Support

For issues not resolved by §A.7, end users contacted the project
authors directly at the email addresses listed in the front-matter of
this dissertation. During the defence period, technical issues were
also escalated in person to the supervising lecturer.

---

*End of Appendix A — User Manual.*
