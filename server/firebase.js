let db = null;

const hasFirebaseConfig =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY;

if (hasFirebaseConfig) {
  try {
    const admin = await import("firebase-admin");
    const firestore = await import("firebase-admin/firestore");

    if (!(admin.default?.apps?.length || admin.apps?.length)) {
      const credentialSource = admin.default?.credential || admin.credential;
      if (credentialSource?.cert) {
        admin.default?.initializeApp
          ? admin.default.initializeApp({
              credential: credentialSource.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
              }),
            })
          : admin.initializeApp({
              credential: credentialSource.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
              }),
            });
      }
    }

    db = firestore.getFirestore();
  } catch (error) {
    console.warn("Firebase unavailable; local JSON fallback will be used.", error.message);
    db = null;
  }
}

export { db };
