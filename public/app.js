const API_BASE = '/api';

let authToken = localStorage.getItem('lib_token') || null;
let currentLibrary = localStorage.getItem('lib_name') || '';
let currentRole = localStorage.getItem('lib_role') || 'admin';

// ==== AUTH LOGIC ====
const authOverlay = document.getElementById('auth-overlay');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

document.getElementById('switch-to-register').addEventListener('click', () => {
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
    document.getElementById('auth-subtitle').textContent = "Register a new library branch";
});

document.getElementById('switch-to-login').addEventListener('click', () => {
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
    document.getElementById('auth-subtitle').textContent = "Login to your account";
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.error || 'Login failed');
        
        loginSuccess(data.token, data.library_name, data.role);
    } catch(err) { alert(err.message); }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const library_name = document.getElementById('reg-libraryName').value;
    const whatsapp_number = document.getElementById('reg-whatsapp').value;
    
    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, library_name, whatsapp_number, role: 'admin' })
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.error || 'Registration failed');
        
        loginSuccess(data.token, data.library_name, data.role);
    } catch(err) { alert(err.message); }
});

function loginSuccess(token, libraryName, role = 'admin') {
    authToken = token;
    currentLibrary = libraryName;
    currentRole = role;
    localStorage.setItem('lib_token', token);
    localStorage.setItem('lib_name', libraryName);
    localStorage.setItem('lib_role', role);
    checkAuth();
}

document.getElementById('btn-logout').addEventListener('click', () => {
    authToken = null;
    currentLibrary = '';
    currentRole = 'admin';
    localStorage.removeItem('lib_token');
    localStorage.removeItem('lib_name');
    localStorage.removeItem('lib_role');
    checkAuth();
});

function checkAuth() {
    if (authToken) {
        authOverlay.classList.remove('active');
        document.getElementById('business-name-display').textContent = currentLibrary;
        
        if (currentRole === 'super_admin') {
            document.getElementById('nav-item-admin').style.display = 'block';
        } else {
            document.getElementById('nav-item-admin').style.display = 'none';
        }
        
        loadDashboard();
    } else {
        authOverlay.classList.add('active');
    }
}

// Wrapper for fetch requests to include Auth Header
async function fetchAuth(url, options = {}) {
    const headers = options.headers ? { ...options.headers } : {};
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    options.headers = headers;
    
    const res = await fetch(url, options);
    if (res.status === 401) {
        document.getElementById('btn-logout').click();
    }
    return res;
}

// ==== STATE ====
let books = [];
let members = [];
let loans = [];
let circSelectedBook = null;
let circSelectedMember = null;
let circMode = 'issue'; // 'issue' or 'return'
let currentBookCoverBase64 = null;
let currentTab = 'dashboard-view';

// ==== DOM ELEMENTS ====
const clockEl = document.getElementById('clock');
const navLinks = document.querySelectorAll('.nav-link');
const views = document.querySelectorAll('.view');
const pageTitle = document.getElementById('page-title');
const modalOverlay = document.getElementById('modal-overlay');

const bookModal = document.getElementById('book-modal');
const memberModal = document.getElementById('member-modal');

const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

// ==== INITIALIZATION ====
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    updateClock();
    setInterval(updateClock, 1000);
    
    setupNavigation();
    setupModals();
    
    if (mobileMenuBtn && sidebar && sidebarOverlay) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.add('show-sidebar');
            sidebarOverlay.classList.add('active');
        });
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('show-sidebar');
            sidebarOverlay.classList.remove('active');
        });
    }
});

function updateClock() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + now.toLocaleDateString();
}

function setupNavigation() {
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            const target = link.getAttribute('data-target');
            views.forEach(view => view.classList.remove('active'));
            document.getElementById(target).classList.add('active');
            
            pageTitle.textContent = link.querySelector('.link-name').textContent;
            currentTab = target;
            
            if (sidebarOverlay && sidebarOverlay.classList.contains('active')) {
                sidebar.classList.remove('show-sidebar');
                sidebarOverlay.classList.remove('active');
            }
            
            if(target === 'dashboard-view') loadDashboard();
            if(target === 'books-view') loadBooks();
            if(target === 'members-view') loadMembers();
            if(target === 'circulation-view') loadCirculation();
            if(target === 'loans-view') loadLoans();
            // Default views will be added for admin-view
        });
    });
}

function setupModals() {
    document.getElementById('btn-close-book-modal').addEventListener('click', hideModal);
    document.getElementById('btn-close-member-modal').addEventListener('click', hideModal);
    
    // -- BOOK MODAL --
    document.getElementById('btn-add-book').addEventListener('click', () => {
        document.getElementById('book-form').reset();
        document.getElementById('book-id').value = '';
        currentBookCoverBase64 = null;
        document.getElementById('book-image-preview').innerHTML = '<span style="color:var(--text-muted);font-size:12px;">+ Add Cover</span>';
        document.getElementById('book-modal-title').textContent = 'Register Book';
        document.getElementById('batch-number-group').style.display = 'none';
        showModal(bookModal);
    });

    document.getElementById('book-image').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            currentBookCoverBase64 = event.target.result;
            document.getElementById('book-image-preview').innerHTML = `<img src="${event.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
        }
        reader.readAsDataURL(file);
    });

    document.getElementById('book-isbn').addEventListener('input', (e) => {
        const isbn = e.target.value;
        const existingBook = books.find(b => b.isbn === isbn);
        if (existingBook && document.getElementById('book-id').value === '') {
            document.getElementById('batch-number-group').style.display = 'block';
            document.getElementById('book-title').value = existingBook.title;
            document.getElementById('book-author').value = existingBook.author;
            document.getElementById('book-category').value = existingBook.category;
            if (existingBook.image) {
                currentBookCoverBase64 = existingBook.image;
                document.getElementById('book-image-preview').innerHTML = `<img src="${existingBook.image}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
            }
        } else {
            document.getElementById('batch-number-group').style.display = 'none';
        }
    });

    document.getElementById('book-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = { 
            title: document.getElementById('book-title').value, 
            author: document.getElementById('book-author').value, 
            isbn: document.getElementById('book-isbn').value, 
            category: document.getElementById('book-category').value, 
            batch_number: document.getElementById('book-batch-no').value,
            image: currentBookCoverBase64
        };
        try {
            await fetchAuth(`${API_BASE}/books`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            hideModal();
            loadBooks();
        } catch (err) { alert('Error saving book'); }
    });

    // -- MEMBER MODAL --
    document.getElementById('btn-add-member').addEventListener('click', () => {
        document.getElementById('member-form').reset();
        document.getElementById('member-id').value = '';
        document.getElementById('member-modal-title').textContent = 'Register Member';
        // Auto gen simple ID
        document.getElementById('member-card-id').value = 'MEM-' + Date.now().toString().slice(-6);
        showModal(memberModal);
    });

    document.getElementById('member-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = { 
            name: document.getElementById('member-name').value, 
            phone: document.getElementById('member-phone').value, 
            address: document.getElementById('member-address').value, 
            member_card_id: document.getElementById('member-card-id').value
        };
        try {
            await fetchAuth(`${API_BASE}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            hideModal();
            loadMembers();
        } catch (err) { alert('Error saving member'); }
    });
}

function showModal(modal) {
    modalOverlay.classList.add('active');
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    modal.classList.add('active');
}

function hideModal() {
    modalOverlay.classList.remove('active');
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
}

// ==== DASHBOARD ====
async function loadDashboard() {
    try {
        const res = await fetchAuth(`${API_BASE}/dashboard`);
        const stats = await res.json();
        
        document.getElementById('dash-total-books').textContent = stats.totalBooks;
        document.getElementById('dash-total-members').textContent = stats.totalMembers;
        document.getElementById('dash-active-loans').textContent = stats.activeLoans;
        
        // Load recent loans
        await loadRecentLoans();
    } catch (err) { console.error(err); }
}

async function loadRecentLoans() {
    try {
        const res = await fetchAuth(`${API_BASE}/loans`);
        const loansList = await res.json();
        const tbody = document.querySelector('#recent-loans-table tbody');
        tbody.innerHTML = '';
        
        loansList.slice(0, 5).forEach(l => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${l.member_id?.name || 'Unknown'}</td>
                <td>${l.book_id?.title || 'Unknown'}</td>
                <td>${l.issue_date}</td>
                <td><span style="color:${l.status === 'active' ? 'orange' : 'green'};">${l.status.toUpperCase()}</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch(err) {}
}

// ==== BOOKS ====
async function loadBooks() {
    try {
        const res = await fetchAuth(`${API_BASE}/books`);
        books = await res.json();
        const tbody = document.querySelector('#books-table tbody');
        tbody.innerHTML = '';
        
        books.forEach(b => {
            const tr = document.createElement('tr');
            const statusBadge = `<span style="padding:4px 8px; border-radius:4px; font-size:12px; font-weight:600; background: ${b.status === 'available' ? '#dcfce7' : '#fee2e2'}; color: ${b.status === 'available' ? '#166534' : '#991b1b'}">${b.status.toUpperCase()}</span>`;
            
            tr.innerHTML = `
                <td><strong>${b.title}</strong><br><small class="text-muted">${b.category || 'No Category'}</small></td>
                <td>${b.author || 'Unknown'}</td>
                <td>${b.isbn} <br> <small class="text-muted">${b.batch_number ? 'Batch: ' + b.batch_number : ''}</small></td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-outline btn-icon-only text-primary" data-id="${b.id}" disabled><i class='bx bx-edit'></i></button>
                    <button class="btn btn-danger btn-icon-only" data-id="${b.id}" disabled><i class='bx bx-trash'></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) { console.error(err); }
}

// ==== MEMBERS ====
async function loadMembers() {
    try {
        const res = await fetchAuth(`${API_BASE}/members`);
        members = await res.json();
        const tbody = document.querySelector('#members-table tbody');
        tbody.innerHTML = '';
        
        members.forEach(m => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${m.name}</strong></td>
                <td>${m.phone} <br> <small class="text-muted">${m.address || ''}</small></td>
                <td><code>${m.member_card_id}</code></td>
                <td>
                    <button class="btn btn-outline btn-icon-only text-primary" data-id="${m.id}" disabled><i class='bx bx-edit'></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) { console.error(err); }
}

// ==== LOANS & FINES ====
async function loadLoans() {
    const statusFilter = document.getElementById('filter-loan-status').value;
    try {
        const res = await fetchAuth(`${API_BASE}/loans`);
        let loansList = await res.json();
        
        if (statusFilter !== 'all') {
            loansList = loansList.filter(l => l.status === statusFilter); // Needs overdue logic enhancement
        }
        
        const tbody = document.querySelector('#loans-table tbody');
        tbody.innerHTML = '';
        
        loansList.forEach(l => {
            const tr = document.createElement('tr');
            
            // Calculate overdue Fine (Rs. 10 per day overdue)
            let fine = 0;
            if (l.status === 'active') {
                const due = new Date(l.due_date);
                const today = new Date();
                if (today > due) {
                    const diffTime = Math.abs(today - due);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    fine = diffDays * 10;
                }
            } else if (l.fine_amount) {
                fine = l.fine_amount;
            }

            tr.innerHTML = `
                <td><strong>${l.member_id?.name || 'N/A'}</strong><br><small class="text-muted">${l.member_id?.member_card_id || ''}</small></td>
                <td><strong>${l.book_id?.title || 'N/A'}</strong><br><small class="text-muted">ISBN: ${l.book_id?.isbn || ''}</small></td>
                <td>Issued: ${l.issue_date}<br><small class="text-danger">Due: ${l.due_date}</small></td>
                <td style="font-weight:bold; color: ${fine > 0 ? 'var(--danger)' : 'var(--text-main)'};">Rs. ${fine.toFixed(2)}</td>
                <td>
                    <span style="padding:4px 8px; border-radius:4px; font-size:12px; font-weight:600; background: ${l.status === 'returned' ? '#dcfce7' : '#fef08a'}; color: ${l.status === 'returned' ? '#166534' : '#854d0e'}">${l.status.toUpperCase()}</span>
                </td>
                <td>
                    ${l.status === 'active' ? `<button class="btn btn-primary btn-sm btn-return-loan" data-id="${l.id}">Return Book</button>` : `<span class="text-muted text-sm">Returned on ${l.return_date||'-'}</span>`}
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.btn-return-loan').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                 if(confirm('Confirm book return?')) {
                     const loanId = e.target.dataset.id;
                     await fetchAuth(`${API_BASE}/loans/return/${loanId}`, { method: 'POST' });
                     loadLoans();
                 }
            });
        });
    } catch(err) { console.error(err); }
}

document.getElementById('filter-loan-status').addEventListener('change', loadLoans);
document.getElementById('btn-clear-loan-filters').addEventListener('click', () => {
    document.getElementById('filter-loan-status').value = 'all';
    loadLoans();
});

// ==== CIRCULATION (POS style) ====
async function loadCirculation() {
    circSelectedBook = null;
    circSelectedMember = null;
    updateCirculationUI();
    
    // Ensure data is cached
    if (books.length === 0) await fetchAuth(`${API_BASE}/books`).then(r => r.json()).then(data => books = data);
    if (members.length === 0) await fetchAuth(`${API_BASE}/members`).then(r => r.json()).then(data => members = data);
    
    renderCirculationBooks(books.filter(b => b.status === 'available'));
}

function renderCirculationBooks(bookList) {
    const grid = document.getElementById('circ-books-grid');
    grid.innerHTML = '';
    
    bookList.forEach(b => {
        const div = document.createElement('div');
        div.className = 'pos-product-card';
        const imgStyle = b.image ? `background-image:url('${b.image}');background-size:cover;background-position:center;` : `background:var(--secondary);`;
        div.innerHTML = `
            <div style="width:100%;height:120px;border-radius:8px;margin-bottom:12px;${imgStyle}"></div>
            <h4 style="font-size:14px; margin-bottom:4px; leading:1.2;">${b.title}</h4>
            <div style="font-size:12px;color:var(--text-muted);">ISBN: ${b.isbn}</div>
        `;
        div.addEventListener('click', () => { circSelectedBook = b; updateCirculationUI(); });
        grid.appendChild(div);
    });
}

function renderCirculationMembers(memberList) {
    const grid = document.getElementById('circ-books-grid');
    grid.innerHTML = '';
    
    memberList.forEach(m => {
        const div = document.createElement('div');
        div.className = 'pos-product-card';
        div.innerHTML = `
            <div style="width:100%;height:60px;border-radius:8px;margin-bottom:12px;background:var(--bg-body);display:flex;align-items:center;justify-content:center;color:var(--text-main);">
                <i class='bx bx-user' style="font-size:24px;"></i>
            </div>
            <h4 style="font-size:14px; margin-bottom:4px;">${m.name}</h4>
            <div style="font-size:12px;color:var(--text-muted);">${m.member_card_id}</div>
        `;
        div.addEventListener('click', () => { circSelectedMember = m; updateCirculationUI(); });
        grid.appendChild(div);
    });
}

// Circulation Tabs handler
document.querySelectorAll('#circulation-view .tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('#circulation-view .tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        if (e.target.dataset.report === 'circ-books') {
            const filterStatus = circMode === 'issue' ? 'available' : 'loaned';
            renderCirculationBooks(books.filter(b => b.status === filterStatus));
        } else {
            renderCirculationMembers(members);
        }
    });
});

// Circulation Search/Scan Handler
document.getElementById('circulation-scan-input').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    
    const activeTab = document.querySelector('#circulation-view .tab-btn.active').dataset.report;
    
    if (activeTab === 'circ-books') {
        const filterStatus = circMode === 'issue' ? 'available' : 'loaned';
        renderCirculationBooks(books.filter(b => b.status === filterStatus && (b.isbn.toLowerCase().includes(query) || b.title.toLowerCase().includes(query))));
    } else {
        renderCirculationMembers(members.filter(m => m.member_card_id.toLowerCase().includes(query) || m.name.toLowerCase().includes(query)));
    }
});

function updateCirculationUI() {
    const memberLabel = document.getElementById('checkout-member-name');
    const bookLabel = document.getElementById('checkout-book-title');
    const issueBtn = document.getElementById('btn-issue-book');
    const statusLabel = document.getElementById('circ-loan-status');
    const dueDateInput = document.getElementById('checkout-due-date');
    
    memberLabel.textContent = circSelectedMember ? `${circSelectedMember.name} (${circSelectedMember.member_card_id})` : 'None Selected';
    bookLabel.textContent = circSelectedBook ? `${circSelectedBook.title} (${circSelectedBook.isbn})` : 'None Selected';
    
    // Auto set due date to 14 days from now if not set
    if (!dueDateInput.value) {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        dueDateInput.value = d.toISOString().split('T')[0];
    }
    
    if (circMode === 'issue') {
        issueBtn.textContent = 'Issue Book';
        issueBtn.className = 'btn btn-primary btn-block btn-lg';
        statusLabel.textContent = 'Ready to Issue';
        dueDateInput.parentElement.style.display = 'block';
        
        if (circSelectedMember && circSelectedBook) {
            issueBtn.disabled = false;
        } else {
            issueBtn.disabled = true;
        }
    } else {
        // Handle Return Mode UI
        issueBtn.textContent = 'Check-in Return';
        issueBtn.className = 'btn btn-success btn-block btn-lg';
        statusLabel.textContent = 'Check-in Returns';
        dueDateInput.parentElement.style.display = 'none';
        
        // Disable Member requirement for fast returns, just need book
        if (circSelectedBook) {
            issueBtn.disabled = false;
        } else {
            issueBtn.disabled = true;
        }
    }
}

document.getElementById('btn-return-mode').addEventListener('click', (e) => {
    if (circMode === 'issue') {
        circMode = 'return';
        e.target.textContent = 'Switch to Issue Mode';
        renderCirculationBooks(books.filter(b => b.status === 'loaned'));
    } else {
        circMode = 'issue';
        e.target.textContent = 'Switch to Check-in Mode';
        renderCirculationBooks(books.filter(b => b.status === 'available'));
    }
    circSelectedBook = null;
    updateCirculationUI();
});

document.getElementById('btn-issue-book').addEventListener('click', async () => {
    if (circMode === 'issue') {
        if (!circSelectedMember || !circSelectedBook) return alert('Select both member and book');
        
        const payload = {
            member_id: circSelectedMember.id,
            book_id: circSelectedBook.id,
            due_date: document.getElementById('checkout-due-date').value
        };
        
        try {
            await fetchAuth(`${API_BASE}/loans/issue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            alert('Book Issued successfully!');
            circSelectedBook = null;
            document.getElementById('circulation-scan-input').value = '';
            
            // Refetch caches
            await loadCirculation(); 
        } catch (err) { alert('Failed to issue book'); }
    } else {
        // Find active loan for this book
        try {
            const listRes = await fetchAuth(`${API_BASE}/loans`);
            const allLoans = await listRes.json();
            const activeLoanForBook = allLoans.find(l => l.book_id && l.book_id._id === circSelectedBook.id && l.status === 'active');
            
            if (!activeLoanForBook) {
                 alert('No active loan found for this book?! Ensure data integrity.');
                 return;
            }
            
            await fetchAuth(`${API_BASE}/loans/return/${activeLoanForBook.id}`, { method: 'POST' });
            alert('Book Checked-in Successfully!');
            circSelectedBook = null;
            document.getElementById('circulation-scan-input').value = '';
            await loadCirculation();
        } catch(err) {
            console.error(err);
            alert('Failed to return book');
        }
    }
});
