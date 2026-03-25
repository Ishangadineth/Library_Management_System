const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseConfig');

const checkDb = (req, res, next) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized' });
  next();
};

// Get all books
router.get('/', checkDb, async (req, res) => {
  try {
    const booksSnapshot = await db.collection('books').get();
    const books = [];
    booksSnapshot.forEach(doc => {
      books.push({ id: doc.id, ...doc.data() });
    });
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check ISBN for duplicates
router.get('/check-isbn/:isbn', checkDb, async (req, res) => {
  try {
    const query = await db.collection('books').where('isbn', '==', req.params.isbn).get();
    if (query.empty) {
      return res.json({ exists: false });
    }
    const existingBooks = [];
    query.forEach(doc => existingBooks.push(doc.data()));
    res.json({ exists: true, count: query.size, books: existingBooks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a new book
router.post('/', checkDb, async (req, res) => {
  try {
    const { isbn, title, author, category, batchNumber, coverImage, publisher } = req.body;
    
    // Check if same ISBN and Batch exists
    const query = await db.collection('books')
      .where('isbn', '==', isbn)
      .where('batchNumber', '==', batchNumber)
      .get();
      
    if (!query.empty) {
      return res.status(400).json({ error: 'Book with this ISBN and Batch Number already exists.' });
    }

    const newBook = {
      isbn,
      title,
      author,
      category,
      publisher: publisher || '',
      batchNumber: batchNumber || '1',
      coverImage: coverImage || '',
      status: 'Available', 
      createdAt: new Date().toISOString(),
      qrCode: `BOOK-${isbn}-${batchNumber}` // Unique QR content
    };

    const docRef = await db.collection('books').add(newBook);
    res.status(201).json({ id: docRef.id, ...newBook });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a book
router.delete('/:id', checkDb, async (req, res) => {
  try {
    await db.collection('books').doc(req.params.id).delete();
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
