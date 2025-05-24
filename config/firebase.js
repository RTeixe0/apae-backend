
// config/firebase.js
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "gs://apae-eventos.firebasestorage.app"
});

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
