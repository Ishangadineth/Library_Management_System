const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseConfig');

const checkDb = (req, res, next) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized' });
  next();
};

router.get('/stats', checkDb, async (req, res) => {
  try {
    // Note: In a production app with huge data, counting like this could be expensive.
    // For small/medium scale, or Firebase count() aggregate query:
    const booksCount = (await db.collection('books').count().get()).data().count;
    const membersCount = (await db.collection('members').count().get()).data().count;
    const activeLoansCount = (await db.collection('circulation').where('status', '==', 'Active').count().get()).data().count;
    
    const transactionsSnapshot = await db.collection('transactions')
      .orderBy('date', 'desc')
      .limit(5)
      .get();
      
    const recentTransactions = [];
    transactionsSnapshot.forEach(doc => {
      recentTransactions.push({ id: doc.id, ...doc.data() });
    });

    res.json({
      totalBooks: booksCount,
      totalMembers: membersCount,
      activeLoans: activeLoansCount,
      recentTransactions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
