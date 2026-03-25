const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseConfig');

const checkDb = (req, res, next) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized' });
  next();
};

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

// Add a new member
router.post('/', checkDb, async (req, res) => {
  try {
    const { name, phone, address, memberCardId } = req.body;
    
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
      createdAt: new Date().toISOString()
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
