const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseConfig');

const checkDb = (req, res, next) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized' });
  next();
};

router.get('/stats', checkDb, async (req, res) => {
  try {
    const booksCount = (await db.collection('books').count().get()).data().count;
    const membersCount = (await db.collection('members').count().get()).data().count;
    const activeLoansCount = (await db.collection('circulation').where('status', '==', 'Active').get()).size;
    
    const transactionsSnapshot = await db.collection('transactions')
      .orderBy('date', 'desc')
      .limit(10)
      .get();
      
    const recentTransactions = [];
    transactionsSnapshot.forEach(doc => {
      recentTransactions.push({ id: doc.id, ...doc.data() });
    });

    // Analytics: Find top read books (Group by title)
    // Note: Firestore doesn't support complex aggregations/GROUP BY easily. 
    // In a real high-scale app we'd use a different approach or cloud functions.
    // For now, let's just get the last 100 circulation records and summarize.
    const allCirculation = await db.collection('circulation').limit(100).get();
    const bookPopularity = {};
    const memberRankings = {};

    allCirculation.forEach(doc => {
      const data = doc.data();
      bookPopularity[data.bookTitle] = (bookPopularity[data.bookTitle] || 0) + 1;
      memberRankings[data.memberName] = (memberRankings[data.memberName] || 0) + 1;
    });

    res.json({
      totalBooks: booksCount,
      totalMembers: membersCount,
      activeLoans: activeLoansCount,
      recentTransactions,
      topBooks: Object.entries(bookPopularity).sort((a,b) => b[1] - a[1]).slice(0, 5),
      topMembers: Object.entries(memberRankings).sort((a,b) => b[1] - a[1]).slice(0, 5)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
