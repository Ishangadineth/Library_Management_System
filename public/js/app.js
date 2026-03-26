const app = {
  state: {
    books: [],
    members: [],
    currentUser: null,
    isAdmin: false,
  },
  
  async init() {
    this.initTheme();
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
        
        document.querySelectorAll('.nav-links a').forEach(l => {
            l.className = 'flex items-center px-6 py-3 text-on-surface-variant hover:bg-surface-container-high transition-colors font-headline font-semibold tracking-wide text-sm';
        });
        
        e.currentTarget.className = 'active flex items-center px-6 py-3 bg-white text-primary rounded-r-full shadow-sm font-headline font-bold tracking-wide text-sm';
        
        const targetId = e.currentTarget.getAttribute('data-target');
        this.switchView(targetId);
      });
    });

    // Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.className = 'filter-btn flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high transition-all rounded-lg cursor-pointer text-sm font-headline uppercase';
            });
            e.currentTarget.className = 'filter-btn active flex items-center gap-3 px-4 py-3 text-primary font-bold bg-white rounded-lg cursor-pointer text-sm font-headline uppercase';
            this.filterBooks(e.currentTarget.getAttribute('data-filter'));
        });
    });

    // Forms
    document.getElementById('addBookForm')?.addEventListener('submit', this.handleAddBook.bind(this));
    document.getElementById('addMemberForm')?.addEventListener('submit', this.handleAddMember.bind(this));
    document.getElementById('borrowBookForm')?.addEventListener('submit', this.handleIssueBook.bind(this));
    document.getElementById('returnBookForm')?.addEventListener('submit', this.handleReturnBook.bind(this));

    // Global Search
    document.getElementById('global-search')?.addEventListener('input', (e) => this.handleGlobalSearch(e.target.value));
    document.getElementById('admin-global-search')?.addEventListener('input', (e) => this.handleGlobalSearch(e.target.value));

    // Login/Logout
    document.getElementById('login-btn')?.addEventListener('click', () => {
        if(this.state.isAdmin) this.handleLogout();
        else this.handleLogin();
    });
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        this.handleLogout();
    });

    // Theme Toggle
    document.getElementById('theme-toggle')?.addEventListener('click', () => this.toggleTheme());
    document.getElementById('theme-toggle-admin')?.addEventListener('click', () => this.toggleTheme());
  },

  switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden', 'd-none'));
    const viewEl = document.getElementById(viewId);
    if(viewEl) viewEl.classList.remove('hidden', 'd-none');

    // Load data based on view
    if (viewId === 'dashboard-view') this.loadDashboard();
    if (viewId === 'inventory-view') this.loadBooksView();
    if (viewId === 'members-view') this.loadMembersView();
    if (viewId === 'circulation-view') this.loadCirculationView();
  },

  openModal(modalId) {
    document.getElementById(modalId)?.classList.add('active');
  },

  closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
  },

  showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${isError ? 'error' : ''}`;
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
      const elTotal = document.getElementById('stat-total-books');
      if (elTotal) elTotal.textContent = stats.totalBooks || 0;
      
      const elMembers = document.getElementById('stat-members');
      if (elMembers) elMembers.textContent = stats.totalMembers || 0;
      
      const elBorrowed = document.getElementById('stat-borrowed');
      if (elBorrowed) elBorrowed.textContent = stats.activeLoans || 0;
      
      const elOverdue = document.getElementById('stat-overdue');
      if (elOverdue) elOverdue.textContent = stats.overdue || 0;

      this.loadFeaturedBooks();
    } catch (error) {
       console.error(error);
    }
  },

  async loadFeaturedBooks(booksToRender) {
    try {
      if (!this.state.books || this.state.books.length === 0) {
        this.state.books = await api.getBooks();
      }
      
      const books = booksToRender || this.state.books;
      const grid = document.getElementById('dashboard-books-grid');
      if (!grid) return;
      
      grid.innerHTML = '';
      
      books.forEach(book => {
        const coverUrl = book.coverImage || 'https://images.unsplash.com/photo-1543004471-240ce8de38f9?q=80&w=1974&auto=format&fit=crop';
        let statusBg = book.status === 'AVAILABLE' ? 'bg-secondary-container' : 'bg-error-container';
        let statusText = book.status === 'AVAILABLE' ? 'text-on-secondary-container' : 'text-on-error-container';
        if (book.status === 'RESERVED') {
            statusBg = 'bg-tertiary-fixed';
            statusText = 'text-on-tertiary-fixed-variant';
        }

        grid.innerHTML += `
          <div class="group flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border border-outline-variant/10" onclick="app.showBookDetails('${book.id}')">
            <div class="relative aspect-[3/4] overflow-hidden bg-surface-container-highest flex items-center justify-center">
              ${book.coverImage 
                ? `<img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${coverUrl}"/>` 
                : `<span class="material-symbols-outlined text-outline-variant text-4xl">book</span>`
              }
              <div class="absolute top-3 right-3">
                <span class="px-3 py-1 ${statusBg} ${statusText} text-[10px] font-bold uppercase tracking-widest rounded-full shadow-sm">${book.status}</span>
              </div>
            </div>
            <div class="p-5 flex flex-col flex-1">
              <span class="text-[10px] font-bold text-primary uppercase tracking-[0.1em] mb-1 line-clamp-1">${book.category || 'Uncategorized'}</span>
              <h3 class="text-lg font-bold text-primary leading-tight mb-1 line-clamp-2">${book.title}</h3>
              <p class="text-sm text-on-surface-variant mb-4 line-clamp-1">${book.author}</p>
              <button class="mt-auto w-full py-2 bg-surface-container-high text-primary font-bold text-xs rounded-lg hover:bg-primary-container hover:text-white transition-colors">View Details</button>
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
      const tbody = document.getElementById('books-table-body');
      if(!tbody) return;
      tbody.innerHTML = '';
      if(books.length === 0) tbody.innerHTML = `<tr><td colspan="3" class="px-6 py-4 text-center text-sm text-on-surface-variant italic">Empty Inventory.</td></tr>`;
      
      books.forEach(book => {
        let statusBg = book.status === 'AVAILABLE' ? 'bg-secondary-container' : 'bg-error-container';
        let statusText = book.status === 'AVAILABLE' ? 'text-on-secondary-container' : 'text-on-error-container';
        const coverEl = book.coverImage
           ? `<img class="w-full h-full object-cover group-hover:scale-105 transition-transform" src="${book.coverImage}">`
           : `<span class="material-symbols-outlined text-outline">book</span>`;

        tbody.innerHTML += `
          <tr class="hover:bg-surface-container-lowest transition-colors group cursor-pointer" onclick="app.showBookDetails('${book.id}')">
            <td class="px-6 py-4">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-16 bg-surface-variant rounded-lg overflow-hidden flex-shrink-0 shadow-sm flex items-center justify-center">
                  ${coverEl}
                </div>
                <div>
                  <p class="text-primary font-headline font-bold text-sm tracking-tight line-clamp-1">${book.title}</p>
                  <p class="text-[11px] text-on-surface-variant font-medium line-clamp-1 mt-1">${book.author} &bull; ${book.category || 'N/A'}</p>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 font-mono text-[11px] text-on-surface-variant font-medium">
              ${book.isbn} <br> <span class="text-[9px] font-bold text-primary">#${book.batchNumber}</span>
            </td>
            <td class="px-6 py-4 text-center">
              <span class="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBg} ${statusText}">
                  ${book.status}
              </span>
            </td>
          </tr>
        `;
      });
    } catch (error) {
      console.error(error);
    }
  },

  async loadMembersView() {
    try {
      const members = await api.getMembers();
      this.state.members = members;
      const tbody = document.getElementById('members-table-body');
      if(!tbody) return;
      tbody.innerHTML = '';
      
      if(members.length === 0) tbody.innerHTML = `<tr><td colspan="2" class="px-6 py-4 text-center text-sm text-on-surface-variant italic">No Members Found.</td></tr>`;

      members.forEach(member => {
        const photo = member.photoUrl || `https://ui-avatars.com/api/?name=${member.name}`;
        tbody.innerHTML += `
          <tr class="hover:bg-surface-container-highest transition-colors group cursor-pointer" onclick="app.showMemberDetail('${member.id}')">
            <td class="px-6 py-4">
              <div class="flex items-center space-x-4">
                <img src="${photo}" class="w-10 h-10 rounded-full border border-outline-variant/20 shadow-sm" />
                <div>
                  <p class="text-primary font-headline font-bold text-sm tracking-tight">${member.name}</p>
                  <p class="text-xs text-on-surface-variant font-medium mt-0.5">${member.phone || 'No phone'}</p>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 font-mono text-[11px] text-on-surface-variant font-medium">
              ${member.memberCardId}
            </td>
          </tr>
        `;
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
    const memInput = document.getElementById('borrowMemberId').value.trim();
    const bookInput = document.getElementById('borrowBookId').value.trim();
    if(!memInput || !bookInput) return this.showToast('Input missing', true);
    
    // Find member by card ID
    const member = this.state.members?.find(m => m.memberCardId === memInput);
    if (!member) return this.showToast('Member not found', true);

    // Find book by ISBN
    const book = this.state.books?.find(b => b.isbn === bookInput && b.status === 'AVAILABLE');
    if (!book) return this.showToast('Book not available or not found', true);
    
    try {
      await api.issueBook(member.id, book.id);
      this.showToast('Book issued successfully!');
      document.getElementById('borrowBookForm').reset();
      this.loadCirculationView();
    } catch (error) {
      this.showToast(error.message, true);
    }
  },

  async handleReturnBook(e) {
    e.preventDefault();
    const bookInput = document.getElementById('returnBookId').value.trim();
    if(!bookInput) return this.showToast('No book given', true);
    
    // Find book by ISBN
    const book = this.state.books?.find(b => b.isbn === bookInput && b.status !== 'AVAILABLE');
    if (!book) return this.showToast('Invalid or not borrowed book', true);

    try {
      const res = await api.returnBook(book.id);
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
    const bookCards = document.querySelectorAll('#dashboard-books-grid > div');
    bookCards.forEach(card => {
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
      if(loginBtn) loginBtn.innerHTML = "<span class='material-symbols-outlined text-sm'>logout</span> Logout";
    } else {
      document.body.classList.remove('is-admin');
      if(loginBtn) loginBtn.innerHTML = "<span class='material-symbols-outlined text-sm'>login</span> Sign In";
    }
  },

  async showBookDetails(bookId) {
    try {
      const book = await api.getBook(bookId);
      const history = await api.getBookHistory(bookId);

      this.state.currentBookId = bookId; // For saving notes later

      // Set Info
      document.getElementById('detail-title').innerText = book.title;
      document.getElementById('detail-author').innerText = book.author;
      
      let statusBg = book.status === 'AVAILABLE' ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container';
      if (book.status === 'RESERVED') statusBg = 'bg-tertiary-fixed text-on-tertiary-fixed-variant';

      const statElement = document.getElementById('detail-status');
      statElement.innerText = book.status;
      statElement.className = `inline-block px-4 py-1.5 text-xs font-bold rounded-full tracking-widest uppercase ${statusBg}`;
      
      document.getElementById('detail-isbn').innerText = book.isbn;
      document.getElementById('detail-batch').innerText = book.batchNumber;
      document.getElementById('detail-category').innerText = book.category || 'Uncategorized';
      document.getElementById('detail-publisher').innerText = book.publisher || 'Unknown';
      document.getElementById('detail-notes').value = book.notes || '';

      // Set Image
      const preview = document.getElementById('detail-cover-container');
      preview.innerHTML = book.coverImage 
        ? `<img src="${book.coverImage}" class="w-full h-full object-cover">`
        : `<span class="material-symbols-outlined text-6xl text-outline-variant">book</span>`;

      // Set History
      const historyBody = document.getElementById('detail-history-body');
      historyBody.innerHTML = '';
      if (history.length > 0) {
        history.forEach(h => {
          const issueDate = new Date(h.issueDate).toLocaleDateString();
          const returnDate = h.returnDate ? new Date(h.returnDate).toLocaleDateString() : '-';
          let historyStatusBg = h.status === 'Returned' ? 'text-secondary-fixed-variant font-bold' : 'text-primary font-bold';
          historyBody.innerHTML += `
            <tr class="hover:bg-surface-container-highest transition-colors">
              <td class="py-3 px-4 font-medium text-primary">${h.memberName}</td>
              <td class="py-3 px-4 text-on-surface-variant">${issueDate} <span class="material-symbols-outlined text-[10px] mx-1">arrow_right_alt</span> ${returnDate}</td>
              <td class="py-3 px-4 ${historyStatusBg}">${h.status}</td>
            </tr>
          `;
        });
      } else {
        historyBody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-on-surface-variant italic">No borrowing history found.</td></tr>';
      }

      // Generate QR
      const qrContainer = document.getElementById('detail-qr-container');
      qrContainer.innerHTML = '';
      setTimeout(() => {
          new QRCode(qrContainer, {
            text: book.qrCode || `BOOK-${book.id}`,
            width: 100, height: 100,
            colorDark : "#1a1c1f", colorLight : "transparent",
          });
      }, 50);

      this.openModal('bookDetailModal');
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
  },

  filterBooks(category) {
    // UI Update
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
      if(btn.innerText.includes(category) || (category === 'all' && btn.innerText.includes('All'))) {
        btn.classList.add('active');
      }
    });

    if (category === 'all') {
      this.loadFeaturedBooks(this.state.books);
    } else {
      const filtered = this.state.books.filter(b => b.category === category);
      this.loadFeaturedBooks(filtered);
    }
  },

  sortBooks(criteria) {
    let sorted = [...this.state.books];
    if (criteria === 'newest') {
      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (criteria === 'title') {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (criteria === 'author') {
      sorted.sort((a, b) => a.author.localeCompare(b.author));
    }
    
    this.loadFeaturedBooks(sorted);
  },

  toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    const icon1 = document.getElementById('theme-toggle');
    const icon2 = document.getElementById('theme-toggle-admin');
    const newIcon = isDark ? 'light_mode' : 'dark_mode';
    if (icon1) icon1.innerText = newIcon;
    if (icon2) icon2.innerText = newIcon;
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  },

  initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      const icon1 = document.getElementById('theme-toggle');
      const icon2 = document.getElementById('theme-toggle-admin');
      if (icon1) icon1.innerText = 'light_mode';
      if (icon2) icon2.innerText = 'light_mode';
    }
  }
};

window.onload = () => app.init();
