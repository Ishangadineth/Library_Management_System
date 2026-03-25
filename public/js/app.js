const app = {
  state: {
    books: [],
    members: [],
    currentUser: null,
    isAdmin: false,
  },
  
  async init() {
    this.checkLogin();
    this.bindEvents();
    this.startClock();
    await this.loadDashboard();
    
    // Remove loading screen after data load
    setTimeout(() => {
      const loader = document.getElementById('loading-screen');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);
      }
    }, 1200);
  },

  startClock() {
    setInterval(() => {
      document.getElementById('live-clock').textContent = new Date().toLocaleTimeString();
    }, 1000);
  },

  bindEvents() {
    // Navigation
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        const targetId = e.currentTarget.getAttribute('data-target');
        this.switchView(targetId);
      });
    });

    // Forms
    document.getElementById('addBookForm').addEventListener('submit', this.handleAddBook.bind(this));
    document.getElementById('addMemberForm').addEventListener('submit', this.handleAddMember.bind(this));
    document.getElementById('issueBookForm').addEventListener('submit', this.handleIssueBook.bind(this));
    document.getElementById('returnBookForm').addEventListener('submit', this.handleReturnBook.bind(this));

    // Global Search
    document.getElementById('global-search').addEventListener('input', (e) => {
        this.handleGlobalSearch(e.target.value);
    });

    // Login/Logout
    document.getElementById('login-btn')?.addEventListener('click', () => {
        if(this.state.isAdmin) this.handleLogout();
        else this.handleLogin();
    });

    // Notifications & Settings
    document.getElementById('notif-btn')?.addEventListener('click', () => {
        this.showToast('You have no new notifications');
    });
    
    document.getElementById('settings-btn')?.addEventListener('click', () => {
        this.showToast('Settings panel is under maintenance');
    });
  },

  switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('d-none'));
    const viewEl = document.getElementById(viewId);
    if(viewEl) viewEl.classList.remove('d-none');

    // Load data based on view
    if (viewId === 'dashboard-view') this.loadDashboard();
    if (viewId === 'books-view') this.loadBooksView();
    if (viewId === 'members-view') this.loadMembersView();
    if (viewId === 'circulation-view') this.loadCirculationView();
  },

  showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
  },

  closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
  },

  showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.borderLeftColor = isError ? 'var(--danger)' : 'var(--primary)';
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
  },

  // ISBN Real-time check logic
  async checkIsbnExist(isbn) {
    if(isbn.length < 5) return;
    try {
        const res = await api.checkIsbnExist(isbn);
        const hint = document.getElementById('isbn-hint');
        const batchInput = document.getElementById('bookBatch');
        
        if (res.exists) {
            hint.classList.remove('d-none');
            hint.textContent = `Existing books found. Recommended Batch: ${res.count + 1}`;
            batchInput.value = res.count + 1;
            // Pre-fill Title/Author if scanned
            document.getElementById('bookTitle').value = res.books[0].title;
            document.getElementById('bookAuthor').value = res.books[0].author;
        } else {
            hint.classList.add('d-none');
            batchInput.value = 1;
        }
    } catch(e) {}
  },

  // View Loaders
  async loadDashboard() {
    try {
      const stats = await api.getDashboardStats();
      document.getElementById('stat-total-books').textContent = stats.totalBooks || 0;
      document.getElementById('stat-total-members').textContent = stats.totalMembers || 0;
      document.getElementById('stat-active-loans').textContent = stats.activeLoans || 0;

      // Top Books List
      const topBooks = document.getElementById('top-books-list');
      topBooks.innerHTML = stats.topBooks && stats.topBooks.length > 0 
        ? stats.topBooks.map(b => `<li><i class='bx bx-star text-warning'></i> ${b[0]} (${b[1]} loans)</li>`).join('')
        : '<li>No loan data available.</li>';

      // Top Members
      const topMembers = document.getElementById('top-members-list');
      topMembers.innerHTML = stats.topMembers && stats.topMembers.length > 0
        ? stats.topMembers.map(m => `<li><i class='bx bx-user-voice text-primary'></i> ${m[0]} (${m[1]} checkouts)</li>`).join('')
        : '<li>No member data available.</li>';

      // Recent Transactions
      const tbody = document.getElementById('recent-transactions-tbody');
      tbody.innerHTML = '';
      if (stats.recentTransactions && stats.recentTransactions.length > 0) {
        stats.recentTransactions.forEach(tx => {
          const fineHtml = tx.finePaid ? `<span class="badge Lost">Rs ${tx.finePaid}</span>` : `<span class="badge Available">None</span>`;
          const typeBadge = tx.type === 'Issue' ? `<span class="badge Loaned">ISSUED</span>` : `<span class="badge Available">RETURNED</span>`;
          tbody.innerHTML += `
            <tr>
              <td>${typeBadge}</td>
              <td><strong>${tx.bookTitle}</strong></td>
              <td>${tx.memberName}</td>
              <td>${new Date(tx.date).toLocaleString()}</td>
              <td>${fineHtml}</td>
            </tr>
          `;
        });
      } else {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center">No recent activity detected.</td></tr>`;
      }

      this.loadFeaturedBooks();
    } catch (error) {
       console.error(error);
    }
  },

  async loadFeaturedBooks() {
    try {
      if (this.state.books.length === 0) {
        this.state.books = await api.getBooks();
      }
      
      const grid = document.getElementById('dashboard-books-grid');
      if (!grid) return;
      
      grid.innerHTML = '';
      const featured = this.state.books.slice(0, 8); // Show first 8 books
      
      featured.forEach(book => {
        const coverEl = book.coverImage 
          ? `<img src="${book.coverImage}" class="book-cover-img" onerror="this.src='https://images.unsplash.com/photo-1543004471-240ce8de38f9?q=80&w=1974&auto=format&fit=crop';">`
          : `<div class="book-placeholder"><i class='bx bx-book'></i></div>`;

        grid.innerHTML += `
          <div class="book-card glass-panel" onclick="app.showBookDetails('${book.id}')">
            ${coverEl}
            <h4>${book.title}</h4>
            <p>${book.author}</p>
            <div class="flex justify-between mt-2">
              <span class="badge ${book.status}">${book.status}</span>
              <small class="text-muted">${book.category || 'N/A'}</small>
            </div>
          </div>
        `;
      });
    } catch (e) { console.error(e); }
  },

  async loadBooksView() {
    try {
      const books = await api.getBooks();
      this.state.books = books;
      const tbody = document.getElementById('books-tbody');
      tbody.innerHTML = '';
      if(books.length === 0) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center">Empty Inventory.</td></tr>`;
      
      books.forEach(book => {
        const qrId = `qr-${book.id}`;
        tbody.innerHTML += `
          <tr onclick="app.showBookDetails('${book.id}')" style="cursor:pointer">
            <td>
                <div id="${qrId}" class="qr-small" title="${book.qrCode}"></div>
            </td>
            <td><strong>${book.title}</strong><br><small class="text-muted">${book.author}</small></td>
            <td>${book.category || 'Uncategorized'}</td>
            <td>${book.isbn}</td>
            <td>#${book.batchNumber}</td>
            <td><span class="badge ${book.status}">${book.status}</span></td>
            <td>
              <button class="btn btn-danger" onclick="event.stopPropagation(); app.deleteBook('${book.id}')"><i class='bx bx-trash'></i></button>
            </td>
          </tr>
        `;
        
        // Generate QR code after render
        setTimeout(() => {
            new QRCode(document.getElementById(qrId), {
                text: book.qrCode,
                width: 40,
                height: 40
            });
        }, 100);
      });
    } catch (error) {
      console.error(error);
    }
  },

  async loadMembersView() {
    try {
      const members = await api.getMembers();
      this.state.members = members;
      const grid = document.getElementById('members-list-grid');
      grid.innerHTML = '';
      
      members.forEach(member => {
        const photo = member.photoUrl || `https://ui-avatars.com/api/?name=${member.name}`;
        grid.innerHTML += `
          <div class="member-card glass-panel" onclick="app.showMemberDetail('${member.id}')">
            <img src="${photo}" class="member-avatar" />
            <div class="member-info">
              <h4>${member.name}</h4>
              <p>ID: ${member.memberCardId}</p>
              <div id="qr-mem-${member.id}" class="qr-micro mt-2"></div>
            </div>
          </div>
        `;
        setTimeout(() => {
            new QRCode(document.getElementById(`qr-mem-${member.id}`), {
                text: member.qrCode,
                width: 30,
                height: 30
            });
        }, 100);
      });
    } catch (error) {
      console.error(error);
    }
  },

  async showMemberDetail(id) {
      const member = this.state.members.find(m => m.id === id);
      if(!member) return;
      
      this.switchView('member-detail-view');
      const profile = document.getElementById('member-profile-info');
      const photo = member.photoUrl || `https://ui-avatars.com/api/?name=${member.name}`;
      profile.innerHTML = `
          <div class="flex items-center">
              <img src="${photo}" style="width:100px;border-radius:50%;margin-right:20px;" />
              <div>
                  <h1>${member.name}</h1>
                  <p>${member.address}</p>
                  <p><strong>PH: ${member.phone}</strong></p>
                  <p>Membership: ${new Date(member.createdAt).toLocaleDateString()}</p>
              </div>
          </div>
      `;
      
      const qrEl = document.getElementById('member-qr-large');
      qrEl.innerHTML = '';
      new QRCode(qrEl, { text: member.qrCode, width: 100, height: 100 });

      // Load history
      try {
          const history = await api.getMemberHistory(id);
          const tbody = document.getElementById('member-history-tbody');
          tbody.innerHTML = history.map(h => `
              <tr>
                  <td>${new Date(h.issueDate).toLocaleDateString()}</td>
                  <td>${h.bookTitle}</td>
                  <td>${h.status === 'Returned' ? '<span class="text-success">Returned</span>' : '<span class="text-warning">On Loan</span>'}</td>
                  <td>${h.fine ? 'Rs '+h.fine : '-'}</td>
              </tr>
          `).join('');
      } catch(e) {}
  },

  async loadCirculationView() {
    try {
      this.state.books = await api.getBooks();
      this.state.members = await api.getMembers();

      const memberSelect = document.getElementById('issueMemberId');
      const issueBookSelect = document.getElementById('issueBookId');
      const returnBookSelect = document.getElementById('returnBookId');

      memberSelect.innerHTML = '<option value="">-- Select Member --</option>';
      this.state.members.forEach(m => {
        memberSelect.innerHTML += `<option value="${m.id}">${m.name} (${m.memberCardId})</option>`;
      });

      issueBookSelect.innerHTML = '<option value="">-- Scan Book --</option>';
      returnBookSelect.innerHTML = '<option value="">-- Scan Returned Book --</option>';

      this.state.books.forEach(b => {
        if (b.status === 'Available') {
          issueBookSelect.innerHTML += `<option value="${b.id}">${b.title} [${b.isbn}]</option>`;
        } else if (b.status === 'Loaned') {
          returnBookSelect.innerHTML += `<option value="${b.id}">${b.title} [${b.isbn}]</option>`;
        }
      });
    } catch (error) {
      console.error(error);
    }
  },

  // Handlers
  async handleAddBook(e) {
    e.preventDefault();
    const data = {
      title: document.getElementById('bookTitle').value,
      author: document.getElementById('bookAuthor').value,
      category: document.getElementById('bookCategory').value,
      publisher: document.getElementById('bookPublisher').value,
      isbn: document.getElementById('bookIsbn').value,
      batchNumber: parseInt(document.getElementById('bookBatch').value),
      coverImage: document.getElementById('bookCover').value,
    };
    try {
      await api.addBook(data);
      this.showToast('Inventory Updated Successfully!');
      this.closeModal('addBookModal');
      document.getElementById('addBookForm').reset();
      this.loadBooksView();
    } catch (error) {
      this.showToast(error.message, true);
    }
  },

  async deleteBook(id) {
    if(!confirm("Are you sure? This cannot be undone.")) return;
    try {
        await api.deleteBook(id);
        this.showToast('Book removed from inventory');
        this.loadBooksView();
    } catch (error) {
        this.showToast(error.message, true);
    }
  },

  async handleAddMember(e) {
    e.preventDefault();
    const data = {
      name: document.getElementById('memberName').value,
      phone: document.getElementById('memberPhone').value,
      address: document.getElementById('memberAddress').value,
      memberCardId: document.getElementById('memberCardId').value,
      photoUrl: document.getElementById('memberPhoto').value,
    };
    try {
      await api.addMember(data);
      this.showToast('New Member Registered!');
      this.closeModal('addMemberModal');
      document.getElementById('addMemberForm').reset();
      this.loadMembersView();
    } catch (error) {
      this.showToast(error.message, true);
    }
  },

  async handleIssueBook(e) {
    e.preventDefault();
    const memberId = document.getElementById('issueMemberId').value;
    const bookId = document.getElementById('issueBookId').value;
    if(!memberId || !bookId) return this.showToast('Selection missing', true);
    
    try {
      await api.issueBook(memberId, bookId);
      this.showToast('Book issued (Due in 14 days)');
      document.getElementById('issueBookForm').reset();
      this.loadCirculationView();
    } catch (error) {
      this.showToast(error.message, true);
    }
  },

  async handleReturnBook(e) {
    e.preventDefault();
    const bookId = document.getElementById('returnBookId').value;
    if(!bookId) return this.showToast('No book selected', true);
    
    try {
      const res = await api.returnBook(bookId);
      let msg = 'Item checked-in successfully.';
      if(res.fine > 0) msg = `Item LATE. Collected Fine: Rs ${res.fine}`;
      this.showToast(msg, res.fine > 0);
      document.getElementById('returnBookForm').reset();
      this.loadCirculationView();
    } catch (error) {
      this.showToast(error.message, true);
    }
  },

  handleGlobalSearch(query) {
    query = query.toLowerCase();
    
    // Filter Table rows
    const rows = document.querySelectorAll('tbody tr');
    rows.forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(query) ? '' : 'none';
    });

    // Filter Dashboard Books
    const bookCards = document.querySelectorAll('.book-card');
    bookCards.forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(query) ? '' : 'none';
    });

    // Filter Member Cards
    const memberCards = document.querySelectorAll('.member-card');
    memberCards.forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(query) ? '' : 'none';
    });
  },

  handleLogin() {
    const password = prompt("Enter Admin Password:");
    if (password === 'admin') {
      this.state.isAdmin = true;
      localStorage.setItem('libraryAdmin', 'true');
      this.updateAdminUI();
      this.showToast('Logged in as Administrator');
    } else {
      this.showToast('Invalid credentials', true);
    }
  },

  handleLogout() {
    this.state.isAdmin = false;
    localStorage.removeItem('libraryAdmin');
    this.updateAdminUI();
    this.showToast('Logged out');
    this.switchView('dashboard-view');
  },

  checkLogin() {
    if (localStorage.getItem('libraryAdmin') === 'true') {
      this.state.isAdmin = true;
      setTimeout(() => this.updateAdminUI(), 100);
    }
  },

  updateAdminUI() {
    const loginBtn = document.getElementById('login-btn');
    if (this.state.isAdmin) {
      document.body.classList.add('is-admin');
      loginBtn.innerHTML = "<i class='bx bx-log-out'></i> Logout";
    } else {
      document.body.classList.remove('is-admin');
      loginBtn.innerHTML = "<i class='bx bx-log-in'></i> Login";
    }
  },

  async showBookDetails(bookId) {
    try {
      const book = await api.getBook(bookId);
      const history = await api.getBookHistory(bookId);

      this.state.currentBookId = bookId; // For saving notes later

      // Set Info
      document.getElementById('detail-title').innerText = book.title;
      document.getElementById('detail-author').innerText = `By ${book.author}`;
      document.getElementById('detail-status').innerText = book.status;
      document.getElementById('detail-status').className = `badge ${book.status} mt-2`;
      document.getElementById('detail-isbn').innerText = book.isbn;
      document.getElementById('detail-batch').innerText = `#${book.batchNumber}`;
      document.getElementById('detail-category').innerText = book.category || 'Uncategorized';
      document.getElementById('detail-publisher').innerText = book.publisher || 'Unknown';
      document.getElementById('detail-notes').value = book.notes || '';

      // Set Image
      const preview = document.getElementById('detail-cover-container');
      preview.innerHTML = book.coverImage 
        ? `<img src="${book.coverImage}" style="width:100%; border-radius:15px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">`
        : `<div class="book-placeholder" style="height:350px;"><i class='bx bx-book'></i></div>`;

      // Set History
      const historyBody = document.getElementById('detail-history-body');
      historyBody.innerHTML = '';
      if (history.length > 0) {
        history.forEach(h => {
          const issueDate = new Date(h.issueDate).toLocaleString();
          const returnDate = h.returnDate ? new Date(h.returnDate).toLocaleString() : '-';
          historyBody.innerHTML += `
            <tr>
              <td>${h.memberName}</td>
              <td>${issueDate}</td>
              <td>${returnDate}</td>
              <td><span class="badge ${h.status}">${h.status}</span></td>
            </tr>
          `;
        });
      } else {
        historyBody.innerHTML = '<tr><td colspan="4" style="text-align:center">No borrowing history found.</td></tr>';
      }

      // Generate QR
      document.getElementById('detail-qr-container').innerHTML = '';
      new QRCode(document.getElementById('detail-qr-container'), {
        text: book.qrCode || `BOOK-${book.id}`,
        width: 120, height: 120,
        colorDark : "#ffffff", colorLight : "transparent",
      });

      this.showModal('bookDetailModal');
    } catch (e) {
      this.showToast(e.message, true);
    }
  },

  async saveBookNotes() {
    const notes = document.getElementById('detail-notes').value;
    const bookId = this.state.currentBookId;
    if (!bookId) return;

    try {
      await api.updateBook(bookId, { notes });
      this.showToast('Librarian notes saved successfully');
    } catch (e) {
      this.showToast(e.message, true);
    }
  }
};

window.onload = () => app.init();
