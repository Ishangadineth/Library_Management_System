// Firebase Web App Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAGdPl_MryyBo8ozgEPQz6EFTyWNU8ikZQ",
  authDomain: "library-management-syste-2700e.firebaseapp.com",
  projectId: "library-management-syste-2700e",
  storageBucket: "library-management-syste-2700e.firebasestorage.app",
  messagingSenderId: "362679866844",
  appId: "1:362679866844:web:af26f3a04495e79162ab19",
  measurementId: "G-VGVYCMKSZG"
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
    const loginBtn = document.getElementById('login-btn');
    if (user) {
        console.log("Logged in as:", user.displayName);
        document.body.classList.add('is-firebase-auth');
        // If it's an admin email, we can auto-grant admin rights here too
        if(user.email === 'admin@example.com') { // Placeholder for admin logic
             app.state.isAdmin = true;
             app.updateAdminUI();
        }
    } else {
        console.log("No user logged in.");
        document.body.classList.remove('is-firebase-auth');
    }
});
