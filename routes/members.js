const express = require('express');
const router = express.Router();
const { admin, db } = require('../config/firebaseConfig');

const checkDb = (req, res, next) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized' });
  next();
};

// GET member by Card ID (used for member login lookup)
router.get('/by-card/:cardId', checkDb, async (req, res) => {
  try {
    const cardId = req.params.cardId.trim();
    // 1. Try exact match
    let snap = await db.collection('members').where('memberCardId', '==', cardId).limit(1).get();
    
    // 2. If not found, try UPPERCASE (usually for IDs)
    if (snap.empty) {
      snap = await db.collection('members').where('memberCardId', '==', cardId.toUpperCase()).limit(1).get();
    }
    // 3. If not found, try lowercase
    if (snap.empty) {
      snap = await db.collection('members').where('memberCardId', '==', cardId.toLowerCase()).limit(1).get();
    }

    if (snap.empty) return res.status(404).json({ error: 'Member not found' });
    const doc = snap.docs[0];
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET member history by Card ID
router.get('/by-card/:cardId/history', checkDb, async (req, res) => {
  try {
    const memberSnap = await db.collection('members').where('memberCardId', '==', req.params.cardId).limit(1).get();
    if (memberSnap.empty) return res.status(404).json({ error: 'Member not found' });
    const memberId = memberSnap.docs[0].id;
    const loanSnap = await db.collection('circulation').where('memberId', '==', memberId).get();
    const history = [];
    loanSnap.forEach(doc => history.push({ id: doc.id, ...doc.data() }));
    history.sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cart: GET member cart
router.get('/by-card/:cardId/cart', checkDb, async (req, res) => {
  try {
    const memberSnap = await db.collection('members').where('memberCardId', '==', req.params.cardId).limit(1).get();
    if (memberSnap.empty) return res.status(404).json({ error: 'Member not found' });
    const memberId = memberSnap.docs[0].id;
    const cartSnap = await db.collection('cart').where('memberId', '==', memberId).get();
    const cart = [];
    cartSnap.forEach(doc => cart.push({ id: doc.id, ...doc.data() }));
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Member Stats: GET summary
router.get('/by-card/:cardId/stats', checkDb, async (req, res) => {
  try {
    const memberSnap = await db.collection('members').where('memberCardId', '==', req.params.cardId).limit(1).get();
    if (memberSnap.empty) return res.status(404).json({ error: 'Member not found' });
    const memberId = memberSnap.docs[0].id;
    
    const loanSnap = await db.collection('circulation').where('memberId', '==', memberId).get();
    
    let stats = {
      totalLoans: 0,
      currentlyBorrowed: 0,
      overdue: 0,
      totalFine: 0
    };

    loanSnap.forEach(doc => {
      const loan = doc.data();
      stats.totalLoans++;
      if (loan.status === 'Active') stats.currentlyBorrowed++;
      if (loan.status === 'Overdue') stats.overdue++;
      if (loan.fine) stats.totalFine += Number(loan.fine);
    });

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cart: Add book to member cart
router.post('/by-card/:cardId/cart', checkDb, async (req, res) => {
  try {
    const { bookId, bookTitle, bookAuthor, coverImage } = req.body;
    const memberSnap = await db.collection('members').where('memberCardId', '==', req.params.cardId).limit(1).get();
    if (memberSnap.empty) return res.status(404).json({ error: 'Member not found' });
    const memberId = memberSnap.docs[0].id;

    // Check if already in cart
    const existing = await db.collection('cart').where('memberId', '==', memberId).where('bookId', '==', bookId).get();
    if (!existing.empty) return res.status(400).json({ error: 'Book already in cart' });

    const ref = await db.collection('cart').add({ 
      memberId, 
      memberCardId: req.params.cardId,
      memberName: memberSnap.docs[0].data().name,
      bookId, 
      bookTitle, 
      bookAuthor, 
      coverImage: coverImage || '', 
      addedAt: new Date().toISOString(),
      status: 'Pending' // Initial status
    });
    res.status(201).json({ id: ref.id, bookId, bookTitle });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cart: Remove book from cart
router.delete('/cart/:cartItemId', checkDb, async (req, res) => {
  try {
    await db.collection('cart').doc(req.params.cartItemId).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Cart: Get all cart items (for admin view)
router.get('/cart/all', checkDb, async (req, res) => {
  try {
    const cartSnap = await db.collection('cart').get();
    const items = [];
    const now = new Date();
    
    cartSnap.forEach(doc => {
      const data = doc.data();
      let status = data.status || 'Pending';
      
      // Calculate Expiry (10 days)
      if (status === 'Pending') {
        const addedAt = new Date(data.addedAt);
        const diffTime = Math.abs(now - addedAt);
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        if (diffDays > 10) status = 'Expired';
      }
      
      items.push({ id: doc.id, ...data, status });
    });
    
    // Sort by addedAt newest first
    items.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all members

router.get('/', checkDb, async (req, res) => {
  try {
    const snapshot = await db.collection('members').get();
    const members = [];
    snapshot.forEach(doc => {
      members.push({ id: doc.id, ...doc.data() });
    });
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET member history
router.get('/:id/history', checkDb, async (req, res) => {
  try {
    const loanSnapshot = await db.collection('circulation')
      .where('memberId', '==', req.params.id)
      .get();
    const history = [];
    loanSnapshot.forEach(doc => {
      history.push({ id: doc.id, ...doc.data() });
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a new member
router.post('/', checkDb, async (req, res) => {
  try {
    const { name, phone, address, memberCardId, photoUrl, birthday, nicNumber } = req.body;
    
    // Check if Member Card ID already exists in Firestore
    const query = await db.collection('members').where('memberCardId', '==', memberCardId).get();
    if (!query.empty) {
      return res.status(400).json({ error: 'Member Card ID already exists.' });
    }

    // --- AUTO-CREATE FIREBASE AUTH ACCOUNT ---
    // Member email for login: CardId@library.ac.lk
    const email = `${memberCardId.toLowerCase().trim()}@library.ac.lk`;
    try {
      await admin.auth().createUser({
        email,
        password: '123456', // Default password
        displayName: name,
        disabled: false
      });
      console.log(`Firebase account created for ${email}`);
    } catch (authErr) {
      if (authErr.code !== 'auth/email-already-in-use') {
        console.error('Firebase Auth creation failed:', authErr.message);
      }
    }

    const newMember = {
      name,
      phone,
      address,
      memberCardId,
      photoUrl: photoUrl || '',
      birthday: birthday || '',
      nicNumber: nicNumber || '',
      createdAt: new Date().toISOString(),
      qrCode: `MEMBER-${memberCardId}`
    };

    const docRef = await db.collection('members').add(newMember);
    res.status(201).json({ id: docRef.id, ...newMember });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a member
router.delete('/:id', checkDb, async (req, res) => {
  try {
    const memberDoc = await db.collection('members').doc(req.params.id).get();
    if (memberDoc.exists) {
      const { memberCardId } = memberDoc.data();
      const email = `${memberCardId.toLowerCase().trim()}@library.ac.lk`;
      
      try {
        const authUser = await admin.auth().getUserByEmail(email);
        if (authUser) await admin.auth().deleteUser(authUser.uid);
      } catch (authErr) {
        // Auth user might not exist, ignore
      }
    }

    await db.collection('members').doc(req.params.id).delete();
    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a member
router.patch('/:id', checkDb, async (req, res) => {
  try {
    const updates = req.body;
    await db.collection('members').doc(req.params.id).update(updates);
    res.json({ message: 'Member updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET the last member card ID for auto-generation
router.get('/card-id/last', checkDb, async (req, res) => {
  try {
    const snapshot = await db.collection('members').orderBy('memberCardId', 'desc').limit(1).get();
    if (snapshot.empty) {
      return res.json({ lastId: '1000' }); // Start from 1000 if none exist
    }
    const lastId = snapshot.docs[0].data().memberCardId;
    res.json({ lastId });
  } catch (error) {
    // If ordering by memberCardId fails (maybe it's not indexed or string vs number), 
    // we catch and try to find manually
    const all = await db.collection('members').get();
    let max = 0;
    all.forEach(doc => {
      const id = parseInt(doc.data().memberCardId);
      if (id > max) max = id;
    });
    res.json({ lastId: max > 0 ? max.toString() : '1000' });
  }
});

module.exports = router;
