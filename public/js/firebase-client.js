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

// --- Auth Helpers ---

async function getIdToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken();
}

async function verifyWithBackend() {
  const token = await getIdToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return null;
    return await res.json(); // { email, displayName, photoURL, role }
  } catch (e) {
    console.error('Backend verify failed:', e);
    return null;
  }
}

// Google Sign-In
window.loginWithGoogle = async () => {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
    // onAuthStateChanged will handle the rest
  } catch (e) {
    app.showToast(e.message, true);
  }
};

// Email/Password Sign-In
window.loginWithEmail = async (email, password) => {
  try {
    await auth.signInWithEmailAndPassword(email, password);
    // onAuthStateChanged will handle the rest
  } catch (e) {
    let msg = 'Login failed.';
    if (e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found') msg = 'Invalid email or password.';
    if (e.code === 'auth/too-many-requests') msg = 'Too many attempts. Please try later.';
    app.showToast(msg, true);
  }
};

// Member Login by Card ID (Card ID + default password)
window.loginWithCardId = async (cardId, password) => {
  if (!cardId) return app.showToast('Card ID is required', true);
  if (!password) password = '1234';
  const email = `${cardId.toLowerCase().trim()}@library.ac.lk`;
  try {
    await auth.signInWithEmailAndPassword(email, password);
    // If successful, onAuthStateChanged will check the backend for the role "member"
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      // If user doesn't exist yet in Firebase, create them
      try {
        await auth.createUserWithEmailAndPassword(email, password);
        // Now also verify the Card ID exists in Firestore
        const memberCheck = await fetch(`/api/members/by-card/${encodeURIComponent(cardId)}`);
        if (!memberCheck.ok) {
          await auth.currentUser.delete();
          return app.showToast('Card ID not found in library system', true);
        }
      } catch (createErr) {
        return app.showToast(createErr.message, true);
      }
    } else if (e.code === 'auth/wrong-password') {
      app.showToast('Incorrect password. Default is 1234', true);
    } else {
      app.showToast(e.message, true);
    }
  }
};

// Sign Out
window.firebaseSignOut = async () => {
  await auth.signOut();
};

// Auth State Listener
auth.onAuthStateChanged(async (user) => {
  if (user) {
    const data = await verifyWithBackend();
    if (data) {
      app.state.currentUser = data;
      app.state.role = data.role;
      app.state.isAdmin = (data.role === 'admin' || data.role === 'superadmin');
      app.closeModal('loginModal');
      app.updateAuthUI();
    } else {
      await auth.signOut();
    }
  } else {
    app.state.currentUser = null;
    app.state.role = null;
    app.state.isAdmin = false;
    app.updateAuthUI();
  }
});
