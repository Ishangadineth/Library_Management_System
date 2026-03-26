const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseConfig');

const checkDb = (req, res, next) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized' });
  next();
};

// GET member by Card ID (used for member login lookup)
router.get('/by-card/:cardId', checkDb, async (req, res) => {
  try {
    const snap = await db.collection('members').where('memberCardId', '==', req.params.cardId).limit(1).get();
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

    const ref = await db.collection('cart').add({ memberId, bookId, bookTitle, bookAuthor, coverImage: coverImage || '', addedAt: new Date().toISOString() });
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
    cartSnap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
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
    const { name, phone, address, memberCardId, photoUrl } = req.body;
    
    // Check if Member Card ID already exists
    const query = await db.collection('members').where('memberCardId', '==', memberCardId).get();
    if (!query.empty) {
      return res.status(400).json({ error: 'Member Card ID already exists.' });
    }

    const newMember = {
      name,
      phone,
      address,
      memberCardId,
      photoUrl: photoUrl || '',
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
    await db.collection('members').doc(req.params.id).delete();
    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
