const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require('./library-management-syste-2700e-firebase-adminsdk-fbsvc-3e5e171272.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

module.exports = { admin, db };
