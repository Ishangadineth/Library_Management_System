const app = {
  state: {
    books: [],
    members: [],
    currentUser: null,
    isAdmin: false,
    role: null,   // 'superadmin' | 'admin' | 'member' | null
  },
  
  async init() {
    this.initTheme();
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

    // Login/Logout — now handled by Firebase (firebase-client.js)
    // login-btn opens loginModal (set via onclick in HTML)
    document.getElementById('logout-btn')?.addEventListener('click', () => this.signOut());

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
    if (viewId === 'cart-view') this.loadCartView();
    if (viewId === 'member-history-view') this.loadMemberHistory();
  },

  switchLoginTab(tab) {
    const adminPanel = document.getElementById('login-panel-admin');
    const memberPanel = document.getElementById('login-panel-member');
    const adminTab = document.getElementById('login-tab-admin');
    const memberTab = document.getElementById('login-tab-member');
    if (tab === 'admin') {
      adminPanel.classList.remove('hidden');
      memberPanel.classList.add('hidden');
      adminTab.classList.add('text-primary', 'border-primary');
      adminTab.classList.remove('text-on-surface-variant', 'border-transparent');
      memberTab.classList.add('text-on-surface-variant', 'border-transparent');
      memberTab.classList.remove('text-primary', 'border-primary');
    } else {
      memberPanel.classList.remove('hidden');
      adminPanel.classList.add('hidden');
      memberTab.classList.add('text-primary', 'border-primary');
      memberTab.classList.remove('text-on-surface-variant', 'border-transparent');
      adminTab.classList.add('text-on-surface-variant', 'border-transparent');
      adminTab.classList.remove('text-primary', 'border-primary');
    }
  },

  openModal(modalId) {
    document.getElementById(modalId)?.classList.add('active');
  },

  closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
  },

  showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return console.log("Toast:", message);

    toast.textContent = message;
    
    // Style
    toast.style.borderLeftColor = isError ? 'var(--danger)' : 'var(--primary)';
    toast.classList.remove('opacity-0', 'translate-y-10', 'pointer-events-none');
    toast.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-10', 'pointer-events-none');
      toast.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
    }, 4000);
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
    const { currentUser, role } = this.state;
    try {
      if (role === 'member') {
        const cardId = currentUser.email.split('@')[0];
        const stats = await api.getMemberStats(cardId);
        
        // Update Labels for Member with safety checks
        const l1 = document.getElementById('stat-label-1');
        const l2 = document.getElementById('stat-label-2');
        const l3 = document.getElementById('stat-label-3');
        const l4 = document.getElementById('stat-label-4');
        if (l1) l1.textContent = 'Total Borrowed';
        if (l2) l2.textContent = 'Currently Out';
        if (l3) l3.textContent = 'Overdue';
        if (l4) l4.textContent = 'Pending Fines (Rs.)';

        // Update Counts with safety checks
        const v1 = document.getElementById('stat-total-books');
        const v2 = document.getElementById('stat-borrowed');
        const v3 = document.getElementById('stat-overdue');
        const v4 = document.getElementById('stat-members');
        if (v1) v1.textContent = stats.totalLoans || 0;
        if (v2) v2.textContent = stats.currentlyBorrowed || 0;
        if (v3) v3.textContent = stats.overdue || 0;
        if (v4) v4.textContent = stats.totalFine || 0;
        
        // Change Subtitle
        const subtitle = document.querySelector('#dashboard-view p');
        if (subtitle) subtitle.textContent = `Welcome back, ${currentUser.displayName || 'Member'}`;
      } else {
        const stats = await api.getDashboardStats();
        
        // Restore Admin Labels with safety checks
        const l1 = document.getElementById('stat-label-1');
        const l2 = document.getElementById('stat-label-2');
        const l3 = document.getElementById('stat-label-3');
        const l4 = document.getElementById('stat-label-4');
        if (l1) l1.textContent = 'Total Books';
        if (l2) l2.textContent = 'Borrowed';
        if (l3) l3.textContent = 'Overdue';
        if (l4) l4.textContent = 'Members';

        const v1 = document.getElementById('stat-total-books');
        const v2 = document.getElementById('stat-borrowed');
        const v3 = document.getElementById('stat-overdue');
        const v4 = document.getElementById('stat-members');
        if (v1) v1.textContent = stats.totalBooks || 0;
        if (v2) v2.textContent = stats.activeLoans || 0;
        if (v3) v3.textContent = stats.overdue || 0;
        if (v4) v4.textContent = stats.totalMembers || 0;

        const subtitle = document.querySelector('#dashboard-view p');
        if (subtitle) subtitle.textContent = 'System Administration Status';
      }

      this.loadFeaturedBooks();
    } catch (error) {
       console.error("Dashboard Load Error:", error);
       this.showToast("Failed to sync dashboard data.");
    }
  },

  goToPublicCatalog() {
    document.getElementById('admin-layout').classList.add('admin-only'); // Ensure hidden if not admin
    document.getElementById('public-layout').classList.remove('hidden', 'public-only');
    document.body.classList.remove('bg-surface'); // Reset body if needed
    // In case layout switching is handled by IDs:
    document.getElementById('admin-layout').style.display = 'none';
    document.getElementById('public-layout').style.display = 'flex';
  },
  async loadFeaturedBooks(booksToRender) {
    try {
      if (!this.state.books || this.state.books.length === 0) {
        this.state.books = await api.getBooks();
      }
      
      const cartItems = await api.getAllCartItems();
      const pendingCart = cartItems.filter(item => item.status === 'Pending' || (!item.status && (new Date() - new Date(item.addedAt)) / (1000 * 60 * 60 * 24) <= 10));

      const books = booksToRender || this.state.books;
      const grid = document.getElementById('dashboard-books-grid');
      if (!grid) return;
      
      grid.innerHTML = '';
      
      // Group by ISBN to handle availability logic across copies
      const groupedBooks = {};
      books.forEach(b => {
        if (!groupedBooks[b.isbn]) {
          groupedBooks[b.isbn] = { ...b, copies: [] };
        }
        groupedBooks[b.isbn].copies.push(b);
      });

      Object.values(groupedBooks).forEach(book => {
        const coverUrl = book.coverImage || 'https://images.unsplash.com/photo-1543004471-240ce8de38f9?q=80&w=1974&auto=format&fit=crop';
        
        // Availability Logic: available copies - pending cart requests for this ISBN
        const availableCopies = book.copies.filter(c => c.status === 'Available');
        const cartForThisIsbn = pendingCart.filter(item => item.isbn === book.isbn || (!item.isbn && item.bookTitle === book.title)); // Fallback to Title
        const netAvailable = availableCopies.length - cartForThisIsbn.length;

        let statusBg = 'bg-secondary-container';
        let statusText = 'text-on-secondary-container';
        let statusLabel = 'AVAILABLE';

        if (netAvailable <= 0) {
            statusBg = 'bg-tertiary-fixed-dim';
            statusText = 'text-on-tertiary-fixed-variant';
            statusLabel = 'IN CART / RESERVED';
        }
        
        // If all copies are actually LOANED out regardless of cart
        if (availableCopies.length === 0) {
            statusBg = 'bg-error-container';
            statusText = 'text-on-error-container';
            statusLabel = 'LOANED OUT';
        }

        grid.innerHTML += `
          <div class="group flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border border-outline-variant/10" onclick="app.showBookDetails('${book.id}')">
            <div class="relative aspect-[3/4] overflow-hidden bg-surface-container-highest flex items-center justify-center">
              ${book.coverImage 
                ? `<img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${coverUrl}"/>` 
                : `<span class="material-symbols-outlined text-outline-variant text-4xl">book</span>`
              }
              <div class="absolute top-3 right-3">
                <span class="px-3 py-1 ${statusBg} ${statusText} text-[10px] font-bold uppercase tracking-widest rounded-full shadow-sm">${statusLabel}</span>
              </div>
            </div>
            <div class="p-5 flex flex-col flex-1">
              <span class="text-[10px] font-bold text-primary uppercase tracking-[0.1em] mb-1 line-clamp-1">${book.category || 'Uncategorized'}</span>
              <h3 class="text-lg font-bold text-primary leading-tight mb-1 line-clamp-2">${book.title}</h3>
              <p class="text-sm text-on-surface-variant mb-4 line-clamp-1">${book.author}</p>
              <div class="mt-auto flex gap-2">
                <button onclick="event.stopPropagation();app.showBookDetails('${book.id}')" class="flex-1 py-2 bg-surface-container-high text-primary font-bold text-xs rounded-lg hover:bg-primary-container hover:text-white transition-colors">View Details</button>
                <button onclick="event.stopPropagation();app.addToCart('${book.id}')" class="px-3 py-2 bg-secondary-container text-on-secondary-container font-bold text-xs rounded-lg hover:bg-secondary hover:text-white transition-colors" title="Add to Cart"><span class="material-symbols-outlined text-sm">add_shopping_cart</span></button>
              </div>
            </div>
          </div>
        `;
      });
    } catch (e) { console.error(e); }
  },},

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
            <td class="px-6 py-4 text-right admin-only">
              <div class="flex items-center justify-end space-x-2">
                <button onclick="event.stopPropagation();app.editBook('${book.id}')" class="p-2 text-primary hover:bg-primary-container hover:text-white rounded-lg transition-colors"><span class="material-symbols-outlined text-sm">edit</span></button>
                <button onclick="event.stopPropagation();app.deleteBook('${book.id}')" class="p-2 text-error hover:bg-error-container rounded-lg transition-colors"><span class="material-symbols-outlined text-sm">delete</span></button>
              </div>
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
              ${member.memberCardId} <br> <span class="text-[9px]">${member.phone}</span>
            </td>
            <td class="px-6 py-4 text-right admin-only">
              <div class="flex items-center justify-end space-x-2">
                <button onclick="event.stopPropagation();app.editMember('${member.id}')" class="p-2 text-primary hover:bg-primary-container hover:text-white rounded-lg transition-colors"><span class="material-symbols-outlined text-sm">edit</span></button>
                <button onclick="event.stopPropagation();app.deleteMember('${member.id}')" class="p-2 text-error hover:bg-error-container rounded-lg transition-colors"><span class="material-symbols-outlined text-sm">delete</span></button>
              </div>
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
          <div class="flex items-center space-x-6">
              <img src="${photo}" class="w-24 h-24 rounded-full border-4 border-primary/10 shadow-lg" />
              <div>
                  <h1 class="text-3xl font-extrabold text-primary font-headline">${member.name}</h1>
                  <p class="text-on-surface-variant font-medium flex items-center gap-2 mt-1"><span class="material-symbols-outlined text-sm">location_on</span> ${member.address}</p>
                  <p class="text-on-surface-variant font-medium flex items-center gap-2 mt-1"><span class="material-symbols-outlined text-sm">call</span> ${member.phone}</p>
                  <div class="flex gap-4 mt-3">
                    <p class="text-[10px] uppercase font-bold text-outline-variant bg-surface-container-highest px-3 py-1 rounded-full">NIC: ${member.nicNumber || 'N/A'}</p>
                    <p class="text-[10px] uppercase font-bold text-outline-variant bg-surface-container-highest px-3 py-1 rounded-full">Birthday: ${member.birthday || 'N/A'}</p>
                  </div>
                  <p class="text-xs text-primary font-bold mt-4">Membership: ${new Date(member.createdAt).toLocaleDateString()}</p>
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

  async editBook(id) {
      const book = this.state.books.find(b => b.id === id);
      if(!book) return;
      this.state.currentEditingBookId = id;
      this.openModal('addBookModal');
      document.getElementById('bookIsbn').value = book.isbn;
      document.getElementById('bookBatch').value = book.batchNumber;
      document.getElementById('bookTitle').value = book.title;
      document.getElementById('bookAuthor').value = book.author;
      document.getElementById('bookPublisher').value = book.publisher;
      document.getElementById('bookCategory').value = book.category;
      document.getElementById('bookCover').value = book.coverImage;
      const btn = document.querySelector('#addBookForm button[type="submit"]');
      btn.textContent = 'Update Book';
  },

  async handleAddMember(e) {
    e.preventDefault();
    const data = {
      name: document.getElementById('memberName').value,
      phone: document.getElementById('memberPhone').value,
      address: document.getElementById('memberAddress').value,
      memberCardId: document.getElementById('memberCardId').value,
      photoUrl: document.getElementById('memberPhoto').value,
      birthday: document.getElementById('memberBirthday').value,
      nicNumber: document.getElementById('memberNIC').value,
    };
    try {
      if (this.state.currentEditingMemberId) {
          await api.updateMember(this.state.currentEditingMemberId, data);
          this.showToast('Member Updated Successfully!');
      } else {
          await api.addMember(data);
          this.showToast('Membership Created Successfully!');
      }
      this.closeModal('addMemberModal');
      document.getElementById('addMemberForm').reset();
      this.state.currentEditingMemberId = null;
      this.loadMembersView();
    } catch (error) {
      this.showToast(error.message, true);
    }
  },

  async deleteMember(id) {
    if(!confirm("Delete this member? This will also remove their portal access.")) return;
    try {
        await api.deleteMember(id);
        this.showToast('Member deleted');
        this.loadMembersView();
    } catch (error) {
        this.showToast(error.message, true);
    }
  },

  async editMember(id) {
      const m = this.state.members.find(m => m.id === id);
      if(!m) return;
      this.state.currentEditingMemberId = id;
      this.openModal('addMemberModal');
      document.getElementById('memberName').value = m.name;
      document.getElementById('memberCardId').value = m.memberCardId;
      document.getElementById('memberPhone').value = m.phone;
      document.getElementById('memberAddress').value = m.address;
      document.getElementById('memberBirthday').value = m.birthday || '';
      document.getElementById('memberNIC').value = m.nicNumber || '';
      document.getElementById('memberPhoto').value = m.photoUrl;
      const btn = document.querySelector('#addMemberForm button[type="submit"]');
      btn.textContent = 'Update Member';
  },

  async toggleCardIdMode(mode) {
      const input = document.getElementById('memberCardId');
      if (mode === 'auto') {
          input.disabled = true;
          input.value = 'Generating...';
          try {
              const res = await api.getLastMemberCardId();
              const nextId = (parseInt(res.lastId) + 1).toString();
              input.value = nextId;
          } catch(e) {
              input.value = '1001';
          }
      } else {
          input.disabled = false;
          input.value = '';
      }
  },

  async addToCart(bookId) {
      if (!this.state.currentUser) {
          this.showToast('Please sign in to add items to your cart', true);
          this.openModal('loginModal');
          return;
      }
      
      if (this.state.role !== 'member') {
          this.showToast('Admin accounts cannot use member cart', true);
          return;
      }

      const book = this.state.books.find(b => b.id === bookId);
      if(!book) return;

      try {
          const cardId = this.state.currentUser.email.split('@')[0];
          await api.addToMemberCart(cardId, {
              bookId: book.id,
              bookTitle: book.title,
              bookAuthor: book.author,
              coverImage: book.coverImage
          });
          this.showToast('Added to Cart Successfully!');
          this.loadCartView();
      } catch (e) {
          this.showToast(e.message, true);
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
    
    const adminName = this.state.currentUser?.displayName || this.state.currentUser?.email || 'Admin';
    const adminEmail = this.state.currentUser?.email || '';

    try {
      await api.issueBook(member.id, book.id, adminName, adminEmail);
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

  // Called by firebase-client.js after auth state changes
  updateAuthUI() {
    try {
      const { currentUser, role } = this.state;
      const loginBtn = document.getElementById('login-btn');
      const profilePill = document.getElementById('user-profile-pill');
      const adminManageBtn = document.getElementById('admin-manage-btn');
      const changePwBtn = document.getElementById('change-pw-btn');
      const adminControlText = document.getElementById('admin-control-text');
      const userInitials = document.getElementById('user-initials');

      if (currentUser) {
        if (loginBtn) loginBtn.classList.add('hidden');
        if (profilePill) {
          profilePill.classList.remove('hidden');
          profilePill.classList.add('flex');
          const avatar = document.getElementById('user-avatar');
          const nameEl = document.getElementById('user-name');
          const badge = document.getElementById('user-role-badge');
          
          if (nameEl) nameEl.textContent = currentUser.displayName || currentUser.email;
          if (badge) {
            badge.textContent = role;
            badge.className = `text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${role === 'member' ? 'bg-secondary text-primary' : 'bg-primary text-white'}`;
          }
          if (avatar) avatar.src = currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || currentUser.email)}&background=random`;
        }

        // Update Header/Avatar text
        if (adminControlText) adminControlText.textContent = role === 'member' ? 'Member Portal' : 'Admin Control';
        if (userInitials) {
           const name = currentUser.displayName || currentUser.email;
           userInitials.textContent = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        }

        // Layout Switching & Role Class
        if (role === 'admin' || role === 'superadmin') {
            document.body.classList.add('is-admin');
        } else {
            document.body.classList.remove('is-admin');
        }

        const publicLayout = document.getElementById('public-layout');
        const adminLayout = document.getElementById('admin-layout');
        
        // Members see portal by default too, but with restricted sidebar
        if (publicLayout) publicLayout.style.display = 'none';
        if (adminLayout) adminLayout.style.display = 'flex';

        // Sidebar Links Visibility
        document.querySelectorAll('.nav-links a[data-target]').forEach(link => {
          const target = link.getAttribute('data-target');
          const memberAllowed = ['dashboard-view', 'member-history-view', 'cart-view'];
          // Also allow public catalog access via goToPublicCatalog if needed, 
          // but here we manage the portal sidebar links
          if (role === 'member') {
            link.style.display = memberAllowed.includes(target) ? 'flex' : 'none';
          } else {
            link.style.display = 'flex';
          }
        });

        if (adminManageBtn) adminManageBtn.style.display = role === 'superadmin' ? 'flex' : 'none';
        if (changePwBtn) changePwBtn.style.display = role === 'member' ? 'flex' : 'none';

        // Auto-load dashboard to show member stats
        this.switchView('dashboard-view');
        // this.showToast(`Welcome back, ${currentUser.displayName || currentUser.email}!`);

      } else {
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (profilePill) { profilePill.classList.add('hidden'); profilePill.classList.remove('flex'); }
        
        document.body.classList.remove('is-admin');
        const publicLayout = document.getElementById('public-layout');
        const adminLayout = document.getElementById('admin-layout');
        if (publicLayout) publicLayout.style.display = 'flex';
        if (adminLayout) adminLayout.style.display = 'none';
        
        if (adminManageBtn) adminManageBtn.style.display = 'none';
        if (changePwBtn) changePwBtn.style.display = 'none';
      }
    } catch (e) {
      console.error("Auth UI Update Error:", e);
    }
  },

  async signOut() {
    await firebaseSignOut();
    this.showToast('Signed out successfully');
    this.switchView('dashboard-view');
  },

  // Admin Management (superadmin only)
  async openAdminManage() {
    this.openModal('adminManageModal');
    this.loadAdminList();
  },

  async loadAdminList() {
    const container = document.getElementById('admin-list');
    if (!container) return;
    container.innerHTML = '<p class="p-4 text-sm text-on-surface-variant italic">Loading...</p>';
    try {
      const token = await getIdToken();
      const res = await fetch('/api/auth/admins', { headers: { 'Authorization': `Bearer ${token}` } });
      const admins = await res.json();
      if (admins.length === 0) {
        container.innerHTML = '<p class="p-4 text-sm text-on-surface-variant italic">No admins found.</p>';
        return;
      }
      container.innerHTML = admins.map(a => `
        <div class="flex items-center justify-between px-4 py-3">
          <div>
            <p class="text-sm font-bold text-primary">${a.email}</p>
            <p class="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">${a.role}</p>
          </div>
          ${a.role !== 'superadmin' ? `<button onclick="app.removeAdmin('${a.email}')" class="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/50 rounded-full transition-all">
            <span class="material-symbols-outlined text-sm">person_remove</span>
          </button>` : ''}
        </div>
      `).join('');
    } catch (e) {
      container.innerHTML = '<p class="p-4 text-sm text-error">Failed to load admins.</p>';
    }
  },

  async addAdmin() {
    const email = document.getElementById('new-admin-email').value.trim();
    if (!email) return this.showToast('Email is required', true);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/auth/add-admin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      this.showToast(`${email} added as admin`);
      document.getElementById('new-admin-email').value = '';
      this.loadAdminList();
    } catch (e) {
      this.showToast(e.message, true);
    }
  },

  async removeAdmin(email) {
    if (!confirm(`Remove admin: ${email}?`)) return;
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/auth/remove-admin/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      this.showToast(`${email} removed as admin`);
      this.loadAdminList();
    } catch (e) {
      this.showToast(e.message, true);
    }
  },

  // Member Change Password
  async changeMemberPassword() {
    const newPw = document.getElementById('new-password-input').value;
    const confirmPw = document.getElementById('confirm-password-input').value;
    if (!newPw || newPw.length < 6) return this.showToast('Password must be at least 6 characters', true);
    if (newPw !== confirmPw) return this.showToast('Passwords do not match', true);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/auth/member/change-password', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPw })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      this.showToast('Password updated successfully!');
      this.closeModal('changePasswordModal');
      document.getElementById('new-password-input').value = '';
      document.getElementById('confirm-password-input').value = '';
    } catch (e) {
      this.showToast(e.message, true);
    }
  },

  // Legacy stubs
  handleLogin() { this.openModal('loginModal'); },
  handleLogout() { this.signOut(); },
  checkLogin() {},
  updateAdminUI() { this.updateAuthUI(); },

  // Cart: Load all cart requests (admin/member view)  async loadCartView(filter = 'All') {
    const container = document.getElementById('cart-list-container');
    if (!container) return;
    const { currentUser, role } = this.state;
    container.innerHTML = '<p class="text-on-surface-variant italic px-6">Loading...</p>';
    
    try {
      let items = await api.getAllCartItems();
      this.state.cartItems = items; // Store for filtering

      if (role === 'member') {
        const cardId = currentUser.email.split('@')[0];
        items = items.filter(item => item.memberCardId === cardId);
      }

      // Apply Filter
      if (filter !== 'All') {
        items = items.filter(item => item.status === filter);
      }
      
      if (items.length === 0) {
        container.innerHTML = `<p class="text-on-surface-variant italic px-6 mt-4">No ${filter === 'All' ? '' : filter} requests found.</p>`;
        return;
      }

      container.innerHTML = items.map(item => {
        let statusColor = 'bg-surface-container-highest text-on-surface-variant';
        if (item.status === 'Successful Issue') statusColor = 'bg-secondary text-white';
        if (item.status === 'Expired') statusColor = 'bg-error text-white';
        if (item.status === 'Pending') statusColor = 'bg-warning text-black';

        return `
          <div class="flex items-center justify-between bg-surface-container-lowest rounded-xl px-6 py-4 border border-outline-variant/10 shadow-sm mx-4 mb-2 hover:border-primary/30 transition-all cursor-pointer" onclick="app.showMemberByCardId('${item.memberCardId}')">
            <div class="flex items-center gap-4">
              ${item.coverImage ? `<img src="${item.coverImage}" class="w-10 h-14 object-cover rounded-lg shadow-sm">` : `<div class="w-10 h-14 bg-surface-container rounded-lg flex items-center justify-center"><span class="material-symbols-outlined text-outline">book</span></div>`}
              <div>
                <p class="text-xs font-bold text-primary uppercase tracking-wider mb-1">${item.status || 'Pending'}</p>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold text-primary">${item.bookTitle}</span>
                  <span class="text-[10px] text-outline-variant bg-surface-container-highest px-2 py-0.5 rounded font-mono">${item.memberCardId}</span>
                </div>
                <p class="text-xs font-bold text-on-surface-variant mt-0.5">${item.memberName || 'Unknown Member'}</p>
                <p class="text-[10px] text-on-surface-variant/70 mt-1">Requested: ${new Date(item.addedAt).toLocaleString()}</p>
              </div>
            </div>
            <div class="flex items-center gap-4">
               <div class="hidden md:block text-right">
                  <p class="text-[9px] font-bold uppercase text-outline-variant">Validity</p>
                  <p class="text-[11px] font-bold text-on-surface-variant">10 Days</p>
               </div>
               <button onclick="event.stopPropagation();app.dismissCartItem('${item.id}')" class="p-2 text-on-surface-variant hover:text-error hover:bg-error-container/50 rounded-full transition-all" title="Dismiss">
                 <span class="material-symbols-outlined text-sm">remove_shopping_cart</span>
               </button>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      container.innerHTML = '<p class="text-on-surface-variant italic px-6 mt-4 text-error">Failed to load cart items.</p>';
    }
  },

  async filterCart(status, btn) {
    // Update active UI
    document.querySelectorAll('.cart-filter').forEach(b => {
      b.classList.remove('bg-primary', 'text-white', 'shadow-sm');
      b.classList.add('bg-surface-container-highest', 'text-on-surface-variant');
    });
    btn.classList.remove('bg-surface-container-highest', 'text-on-surface-variant');
    btn.classList.add('bg-primary', 'text-white', 'shadow-sm');
    
    this.loadCartView(status);
  },

  async showMemberByCardId(cardId) {
    if (!cardId) return;
    try {
      if (!this.state.members) this.state.members = await api.getMembers();
      const member = this.state.members.find(m => m.memberCardId === cardId);
      if (member) {
        this.showMemberDetail(member.id);
      } else {
        this.showToast('Member details not found', true);
      }
    } catch (e) { console.error(e); }
  },},

  async dismissCartItem(cartItemId) {
    try {
      await api.removeFromCart(cartItemId);
      this.showToast('Cart item removed');
      this.loadCartView();
    } catch (e) {
      this.showToast(e.message, true);
    }
  },

  // Add book to member's cart (from public catalog)
  async addToCart(bookId) {
    const { currentUser, role } = this.state;
    if (!currentUser || role !== 'member') {
      this.openModal('loginModal');
      this.switchLoginTab('member');
      return;
    }
    // Get cardId from email format: cardId@library.ac.lk
    const cardId = currentUser.email.replace('@library.ac.lk', '');
    const book = this.state.books.find(b => b.id === bookId);
    if (!book) return this.showToast('Book not found', true);
    
    try {
      await api.addToMemberCart(cardId, {
        bookId: book.id,
        isbn: book.isbn, // Crucial for availability logic
        bookTitle: book.title,
        bookAuthor: book.author,
        coverImage: book.coverImage || ''
      });
      this.showToast(`"${book.title}" added to your cart! Please issue this book within 10 days.`);
      this.loadFeaturedBooks(); // Refresh availability tags
    } catch (e) {
      this.showToast(e.message, true);
    }
  },

  // Member: Load their own issue/return history
  async loadMemberHistory() {
    const tbody = document.getElementById('member-history-tbody');
    if (!tbody) return;
    const { currentUser, role } = this.state;
    if (!currentUser || role !== 'member') return;
    const cardId = currentUser.email.replace('@library.ac.lk', '');
    tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-on-surface-variant italic">Loading...</td></tr>';
    try {
      const history = await api.getMemberHistoryByCard(cardId);
      if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-on-surface-variant italic">No borrowing history.</td></tr>';
        return;
      }
      tbody.innerHTML = history.map(h => {
        const statusClass = h.status === 'Returned' ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container';
        return `
          <tr class="hover:bg-surface-container-highest transition-colors">
            <td class="px-6 py-4 font-bold text-primary text-sm">${h.bookTitle || '-'}</td>
            <td class="px-6 py-4 text-xs text-on-surface-variant">${h.issueDate ? new Date(h.issueDate).toLocaleDateString() : '-'}</td>
            <td class="px-6 py-4 text-xs text-on-surface-variant">${h.returnDate ? new Date(h.returnDate).toLocaleDateString() : new Date(h.dueDate).toLocaleDateString()}</td>
            <td class="px-6 py-4 text-xs font-medium text-primary">${h.issuedBy || 'Admin'}</td>
            <td class="px-6 py-4"><span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase ${statusClass}">${h.status}</span></td>
            <td class="px-6 py-4 text-xs font-bold ${h.fine > 0 ? 'text-error' : 'text-on-surface-variant'}">${h.fine > 0 ? 'Rs ' + h.fine : '-'}</td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-error italic">Failed to load history.</td></tr>';
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
    if (icon1) {
        const span = icon1.querySelector('span');
        if (span) span.textContent = newIcon;
        else icon1.textContent = newIcon; // Fallback for plain btn
    }
    if (icon2) {
        const span = icon2.querySelector('span');
        if (span) span.textContent = newIcon;
        else icon2.textContent = newIcon;
    }
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
