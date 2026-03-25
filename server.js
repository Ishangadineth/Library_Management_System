const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { encrypt } = require('./utils/encryption');
const { connectDB, initializeDatabase, User, Book, Member, Loan } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
if (process.env.NODE_ENV !== 'production') {
    connectDB().then(() => {
        initializeDatabase();
    });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==== AUTH API ====

app.post('/api/auth/register', async (req, res) => {
    const { email, password, library_name, whatsapp_number, role } = req.body;
    if (!email || !password || !library_name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
        const encryptedEmail = encrypt(email.toLowerCase());
        const existingUser = await User.findOne({ email: encryptedEmail });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ 
            email: email.toLowerCase(),
            password: hashedPassword, 
            library_name, 
            whatsapp_number,
            role: role || 'admin'
        });
        res.status(201).json({ 
            token: user._id.toString(), 
            library_name: user.library_name, 
            role: user.role 
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const encryptedEmail = encrypt(email.toLowerCase());
        const user = await User.findOne({ email: encryptedEmail });
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({ token: user._id.toString(), library_name: user.library_name, role: user.role });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// ==== AUTH MIDDLEWARE ====
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    
    const token = authHeader.split(' ')[1];
    try {
        const user = await User.findById(token);
        if (!user) return res.status(401).json({ error: 'Unauthorized' });
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
};

app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/auth') || req.path.startsWith('/public')) return next();
    return authMiddleware(req, res, next);
});

// ==== ROLES MIDDLEWARE ====
const superAdminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'super_admin') next();
    else res.status(403).json({ error: 'Super Admin only' });
};

const adminOnly = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) next();
    else res.status(403).json({ error: 'Admin access required' });
};

// ==== BOOKS API ====

app.get('/api/books', async (req, res) => {
    try {
        const query = req.user.role === 'super_admin' ? {} : { user_id: req.user._id };
        const books = await Book.find(query).sort({ title: 1 });
        res.json(books.map(b => ({ ...b.toObject(), id: b._id })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/books', adminOnly, async (req, res) => {
    try {
        const book = await Book.create({ ...req.body, user_id: req.user._id });
        res.status(201).json(book);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==== MEMBERS API ====

app.get('/api/members', async (req, res) => {
    try {
        const query = req.user.role === 'super_admin' ? {} : { user_id: req.user._id };
        const members = await Member.find(query);
        res.json(members.map(m => ({ ...m.toObject(), id: m._id })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/members', adminOnly, async (req, res) => {
    try {
        const member = await Member.create({ ...req.body, user_id: req.user._id });
        res.status(201).json(member);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==== LOANS (CIRCULATION) API ====

app.post('/api/loans/issue', adminOnly, async (req, res) => {
    const { member_id, book_id, due_date } = req.body;
    try {
        const book = await Book.findById(book_id);
        if (!book || book.status !== 'available') {
            return res.status(400).json({ error: 'Book not available' });
        }

        const loan = await Loan.create({
            user_id: req.user._id,
            member_id,
            book_id,
            issue_date: new Date().toISOString().split('T')[0],
            due_date,
            status: 'active'
        });

        await Book.findByIdAndUpdate(book_id, { status: 'loaned' });
        res.status(201).json(loan);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/loans/return/:id', adminOnly, async (req, res) => {
    try {
        const loan = await Loan.findById(req.params.id);
        if (!loan) return res.status(404).json({ error: 'Loan not found' });

        loan.status = 'returned';
        loan.return_date = new Date().toISOString().split('T')[0];
        await loan.save();

        await Book.findByIdAndUpdate(loan.book_id, { status: 'available' });
        res.json({ message: 'Book returned successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/loans', async (req, res) => {
    try {
        const query = req.user.role === 'super_admin' ? {} : { user_id: req.user._id };
        const loansList = await Loan.find(query)
            .populate('book_id', 'title isbn')
            .populate('member_id', 'name member_card_id')
            .sort({ issue_date: -1 });
            
        res.json(loansList.map(l => ({ ...l.toObject(), id: l._id })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==== DASHBOARD API ====
app.get('/api/dashboard', async (req, res) => {
    try {
        const query = req.user.role === 'super_admin' ? {} : { user_id: req.user._id };
        const totalBooks = await Book.countDocuments(query);
        const totalMembers = await Member.countDocuments(query);
        const activeLoans = await Loan.countDocuments({ ...query, status: 'active' });
        res.json({ totalBooks, totalMembers, activeLoans });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export app for Vercel
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}
module.exports = app;
