/* ============================================================
   firebase-config.js — YOUR Firebase Project Credentials
   ============================================================
   SETUP STEPS:
   1. Go to https://console.firebase.google.com
   2. Create a new project (or select existing)
   3. Click the </> (Web) icon → Register app → copy the firebaseConfig
   4. Replace EVERY "YOUR_..." value below with your actual values
   5. In Firebase Console → Authentication → Sign-in method → Enable "Google"
   6. In Firebase Console → Firestore Database → Create database (production mode)
   7. In Firebase Console → Authentication → Settings → Authorized domains
      → Add your GitHub Pages domain, e.g. "your-username.github.io"
   ============================================================ */

const FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
