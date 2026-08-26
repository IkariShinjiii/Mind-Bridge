Firebase + Google Sign-In setup

Environment variables (server):
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY   # replace real newlines with \n when stored in env files
- APP_URL                # optional, used for dev email links
- VITE_API_URL           # optional fallback

How Google Sign-In works in this app
- The client uses the Firebase JS SDK to sign the user in with Google and obtains an ID token.
- The client POSTs { idToken } to POST /api/auth/google-signin.
- The server verifies the ID token using the firebase-admin SDK.
- Only emails ending with @usa.edu.ph are accepted.
- On successful verification the server creates or updates a local user record and (if configured) a Firestore Users document with the same id.
- The server returns a signed JWT (the app's own session token) so the frontend can call the existing REST endpoints.

Frontend sample (React) to obtain ID token and exchange it on the server:

import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

// After initializing Firebase app and auth:
const provider = new GoogleAuthProvider();
const auth = getAuth();

async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  const res = await fetch(`${API_BASE_URL}/api/auth/google-signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  return res.json(); // contains { token, user }
}

Notes
- Do not commit your Firebase service account credentials to source control. Store them in environment variables or your deployment platform's secret manager.
- The server mirrors Firestore-created users into server/data.json to keep the existing file-based logic working during incremental migration.
