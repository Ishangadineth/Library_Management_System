const admin = require('firebase-admin');

let serviceAccount;

try {
  // Try loading from environment variable (recommended for Vercel)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // Fallback to local file for development
    serviceAccount = require('./library-management-syste-2700e-firebase-adminsdk-fbsvc-3e5e171272.json');
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} catch (error) {
  console.error("Firebase Initialization Error:", error.message);
}

const db = admin.apps.length ? admin.firestore() : null;

module.exports = { admin, db };
