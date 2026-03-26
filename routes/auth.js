const express = require('express');
const router = express.Router();
const { admin, db } = require('../config/firebaseConfig');

const SUPER_ADMIN_EMAIL = 'ishanga20051223@gmail.com';

// Middleware: Verify Firebase ID token and attach user + role
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token' });
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;

    // Fetch role from Firestore
    const roleDoc = await db.collection('roles').doc(decoded.email).get();
    if (roleDoc.exists) {
      req.role = roleDoc.data().role;
    } else if (decoded.email === SUPER_ADMIN_EMAIL) {
      req.role = 'superadmin';
    } else {
      req.role = 'member';
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token', details: err.message });
  }
}

// Middleware: Require superadmin role
function requireSuperAdmin(req, res, next) {
  if (req.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden: Superadmin only' });
  next();
}

// POST /api/auth/verify
// After client signs in, call this to get the role. Also seeds superadmin role.
router.post('/verify', verifyToken, async (req, res) => {
  const { email } = req.user;

  // Auto-seed superadmin role in Firestore if not present
  if (email === SUPER_ADMIN_EMAIL) {
    const superRef = db.collection('roles').doc(email);
    const snap = await superRef.get();
    if (!snap.exists) {
      await superRef.set({ role: 'superadmin', addedAt: new Date().toISOString() });
    }
  }

  res.json({
    email,
    displayName: req.user.name || email,
    photoURL: req.user.picture || null,
    role: req.role
  });
});

// GET /api/auth/admins
// List all admins (superadmin only)
router.get('/admins', verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const snap = await db.collection('roles').get();
    const admins = [];
    snap.forEach(doc => admins.push({ email: doc.id, ...doc.data() }));
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/add-admin
// Add a new admin { email } (superadmin only)
router.post('/add-admin', verifyToken, requireSuperAdmin, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  if (email === SUPER_ADMIN_EMAIL) return res.status(400).json({ error: 'Cannot modify superadmin role' });

  try {
    await db.collection('roles').doc(email).set({
      role: 'admin',
      addedBy: req.user.email,
      addedAt: new Date().toISOString()
    });
    res.json({ success: true, email, role: 'admin' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/remove-admin/:email
// Remove an admin (superadmin only)
router.delete('/remove-admin/:email', verifyToken, requireSuperAdmin, async (req, res) => {
  const email = decodeURIComponent(req.params.email);
  if (email === SUPER_ADMIN_EMAIL) return res.status(400).json({ error: 'Cannot remove superadmin' });
  try {
    await db.collection('roles').doc(email).delete();
    res.json({ success: true, removed: email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/member/change-password
// Member changes their own password { newPassword }
router.post('/member/change-password', verifyToken, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  try {
    await admin.auth().updateUser(req.user.uid, { password: newPassword });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.verifyToken = verifyToken;
