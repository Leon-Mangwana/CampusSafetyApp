# Campus Safety Application

A cross-platform mobile application for university campus safety, enabling crowdsourced incident reporting, real-time heatmap visualization, SOS alerts, and security officer dashboards.

## Project Structure

```
CampusSafetyApp/
├── backend/             # Node.js + Express API server
│   ├── config/          # Firebase configuration
│   ├── controllers/     # Route handlers (auth, incidents, SOS, notifications)
│   ├── middleware/       # Authentication & rate limiting
│   ├── routes/          # API route definitions
│   ├── utils/           # Notification helpers, Haversine distance
│   ├── server.js        # Express app entry point
│   └── database.rules.json  # Firebase Realtime Database security rules
├── mobile/              # React Native (Expo) mobile app
│   ├── src/
│   │   ├── constants/   # Theme colors, config, incident types
│   │   ├── context/     # AuthContext (authentication state)
│   │   ├── navigation/  # React Navigation setup
│   │   ├── screens/     # All app screens
│   │   └── services/    # API client layer, Firebase init
│   └── App.js           # Entry point
└── README.md
```

## Features

- **Incident Reporting** — Submit reports with GPS auto-detection
- **Real-Time Heatmap** — Google Maps overlay showing incident density by severity
- **SOS Alert System** — Hold-to-activate emergency alert with live GPS tracking to security
- **Emergency Contacts** — Quick-dial emergency numbers for campus security, police, and support services
- **Push Notifications** — Real-time alerts for nearby high-severity incidents
- **Security Dashboard** — Officer view for managing incidents and responding to SOS alerts
- **Safety Statistics** — Analytics on incident types, severity distribution, and hotspots
- **Password Reset** — Firebase-powered forgot password flow
- **Role-Based Access** — Student, staff, security, and admin roles

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Firebase project with Realtime Database and Authentication enabled
- Google Maps API key (for heatmap)
- Android Studio / Xcode (for emulator) or Expo Go app on a physical device

## Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   npm install
   ```

2. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Fill in your Firebase credentials in `.env`:
   - `FIREBASE_PROJECT_ID` — from Firebase Console > Project Settings
   - `FIREBASE_PRIVATE_KEY` — from service account JSON (include quotes)
   - `FIREBASE_CLIENT_EMAIL` — from service account JSON
   - `FIREBASE_DATABASE_URL` — your Realtime Database URL
   - `JWT_SECRET` — any strong random string
   - `GOOGLE_MAPS_API_KEY` — from Google Cloud Console

4. Start the server:
   ```bash
   npm run dev    # development with auto-reload
   npm start      # production
   ```

   The API runs on `http://localhost:3000` by default.

## Mobile App Setup

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   npm install
   ```

2. Update `src/constants/config.js`:
   - Set `API_BASE_URL` to your backend URL (use your machine's local IP for physical devices, e.g., `http://192.168.1.100:3000/api`)
   - Add your Firebase web config values

3. Start the Expo development server:
   ```bash
   npx expo start
   ```

4. Run on a device:
   - **Android**: Press `a` to open in Android emulator, or scan QR code with Expo Go
   - **iOS**: Press `i` to open in iOS simulator, or scan QR code with Expo Go

## Tech Stack

- **Frontend**: React Native, Expo, React Navigation 7
- **Backend**: Node.js, Express.js, Firebase Admin SDK
- **Database**: Firebase Realtime Database
- **Authentication**: Firebase Authentication
- **Push Notifications**: Firebase Cloud Messaging
- **Maps**: react-native-maps (Google Maps)
- **Location**: expo-location

## License

This project is open source and available for academic and educational purposes.
