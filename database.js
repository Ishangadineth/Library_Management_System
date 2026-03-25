const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { encrypt, decrypt } = require('./utils/encryption');

// Global variable to cache the mongoose connection
let cachedDb = null;

const connectDB = async () => {
    if (cachedDb) {
        console.log('Using cached MongoDB connection');
        return cachedDb;
    }

    try {
        const uri = process.env.MONGO_URI || 'mongodb+srv://shamod:Abc%4012345@cluster0.obj5rak.mongodb.net/?appName=Cluster0';
        const db = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000 // Tweak timeout down so Serverless fails faster instead of hanging
        });

        cachedDb = db;
        console.log('Connected to MongoDB database');
        return db;
    } catch (err) {
        console.error('Error connecting to MongoDB:', err.message);
        throw err; // don't process.exit(1) in serverless!
    }
};

// -- SCHEMAS --

// -- SCHEMAS --

const UserSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true,
        set: (v) => v ? encrypt(v.toLowerCase()) : v,
        get: (v) => v ? decrypt(v) : v
    },
    password: { type: String, required: true },
    library_name: { type: String, required: true },
    whatsapp_number: { type: String },
    role: { 
        type: String, 
        enum: ['super_admin', 'admin', 'librarian'], 
        default: 'admin' 
    }
}, {
    toJSON: { getters: true },
    toObject: { getters: true }
});

const BookSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    author: { type: String },
    isbn: { type: String },
    publisher: { type: String },
    category: { type: String },
    batch_number: { type: String },
    image: { type: String },
    status: { type: String, enum: ['available', 'loaned'], default: 'available' }
});

const MemberSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    address: { type: String },
    phone: { type: String },
    photo_url: { type: String },
    member_card_id: { type: String, unique: true }
});

const LoanSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    member_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    book_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    issue_date: { type: String, required: true },
    due_date: { type: String, required: true },
    return_date: { type: String }, 
    fine_amount: { type: Number, default: 0.0 },
    status: { type: String, enum: ['active', 'returned'], default: 'active' }
});

// -- MODELS --
const User = mongoose.model('User', UserSchema);
const Book = mongoose.model('Book', BookSchema);
const Member = mongoose.model('Member', MemberSchema);
const Loan = mongoose.model('Loan', LoanSchema);

// Create default Super Admin user "ids"
const initializeDatabase = async () => {
    try {
        const idsEmailEnc = encrypt('ids@library.com'); 
        const idsExists = await User.findOne({ email: idsEmailEnc });
        
        if (!idsExists) {
            const hashedPassword = await bcrypt.hash('ids1234', 10);
            await User.create({
                email: 'ids@library.com',
                password: hashedPassword,
                library_name: 'Super Admin Portal',
                role: 'super_admin'
            });
            console.log('Super Admin "ids" created.');
        }
    } catch (err) {
        console.error('Error initializing default user:', err.message);
    }
};

module.exports = {
    connectDB,
    initializeDatabase,
    User,
    Book,
    Member,
    Loan
};
