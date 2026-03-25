const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseConfig');

const checkDb = (req, res, next) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized' });
  next();
};

// Issue a book
router.post('/issue', checkDb, async (req, res) => {
  try {
    const { memberId, bookId } = req.body;

    const bookRef = db.collection('books').doc(bookId);
    const bookDoc = await bookRef.get();

    if (!bookDoc.exists) return res.status(404).json({ error: 'Book not found' });
    if (bookDoc.data().status !== 'Available') return res.status(400).json({ error: 'Book is not available for issue' });

    const memberRef = db.collection('members').doc(memberId);
    const memberDoc = await memberRef.get();
    if (!memberDoc.exists) return res.status(404).json({ error: 'Member not found' });

    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(issueDate.getDate() + 14); // 14 days from now

    // Create loan record
    const loan = {
      bookId,
      bookTitle: bookDoc.data().title,
      memberId,
      memberName: memberDoc.data().name,
      issueDate: issueDate.toISOString(),
      dueDate: dueDate.toISOString(),
      status: 'Active',
      type: 'Issue'
    };

    await db.collection('circulation').add(loan);

    // Record Transaction
    await db.collection('transactions').add({
      type: 'Issue',
      bookTitle: bookDoc.data().title,
      memberName: memberDoc.data().name,
      date: new Date().toISOString()
    });

    // Update book status
    await bookRef.update({ status: 'Loaned' });

    res.json({ message: 'Book issued successfully', loan });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Return a book
router.post('/return', checkDb, async (req, res) => {
  try {
    const { bookId } = req.body;

    // Find active loan for this book
    const loanQuery = await db.collection('circulation')
      .where('bookId', '==', bookId)
      .where('status', '==', 'Active')
      .limit(1)
      .get();

    if (loanQuery.empty) {
      return res.status(404).json({ error: 'No active loan found for this book' });
    }

    const loanDoc = loanQuery.docs[0];
    const loanData = loanDoc.data();

    const returnDate = new Date();
    const dueDate = new Date(loanData.dueDate);
    
    let fine = 0;
    if (returnDate > dueDate) {
      const diffTime = Math.abs(returnDate - dueDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      fine = diffDays * 10; // Rs 10 per day
    }

    // Update loan
    await db.collection('circulation').doc(loanDoc.id).update({
      status: 'Returned',
      returnDate: returnDate.toISOString(),
      fine: fine
    });

    // Record Transaction
    await db.collection('transactions').add({
      type: 'Return',
      bookTitle: loanData.bookTitle,
      memberName: loanData.memberName,
      date: new Date().toISOString(),
      finePaid: fine
    });

    // Update book status
    await db.collection('books').doc(bookId).update({ status: 'Available' });

    res.json({ message: 'Book returned successfully', fine });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active loans
router.get('/active', checkDb, async (req, res) => {
  try {
    const loansSnapshot = await db.collection('circulation').where('status', '==', 'Active').get();
    const loans = [];
    loansSnapshot.forEach(doc => {
      loans.push({ id: doc.id, ...doc.data() });
    });
    res.json(loans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get history for a specific book
router.get('/history/:bookId', checkDb, async (req, res) => {
  try {
    const historySnapshot = await db.collection('circulation')
      .where('bookId', '==', req.params.bookId)
      .get();
    
    const history = [];
    historySnapshot.forEach(doc => {
      history.push({ id: doc.id, ...doc.data() });
    });

    // Sort in JS instead of Firestore to avoid index requirement
    history.sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
