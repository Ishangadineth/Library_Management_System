// Firebase Web App Configuration
// To make this work, go to Firebase Console (Online) -> Project Settings -> General -> Your Apps -> Web App configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Function to handle Google Login
const loginWithGoogle = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    return auth.signInWithPopup(provider);
};

// Auth listener
auth.onAuthStateChanged(user => {
    if (user) {
        console.log("Logged in as:", user.displayName);
        // We will integrate this into our main app.js soon
    } else {
        console.log("No user logged in.");
    }
});
