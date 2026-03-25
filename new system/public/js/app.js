const app = {
  state: {
    books: [],
    members: [],
  },
  
  init() {
    this.bindEvents();
    this.loadDashboard();
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
  },

  switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('d-none'));
    document.getElementById(viewId).classList.remove('d-none');

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

  // View Loaders
  async loadDashboard() {
    try {
      const stats = await api.getDashboardStats();
      document.getElementById('stat-total-books').textContent = stats.totalBooks || 0;
      document.getElementById('stat-total-members').textContent = stats.totalMembers || 0;
      document.getElementById('stat-active-loans').textContent = stats.activeLoans || 0;

      const tbody = document.getElementById('recent-transactions-tbody');
      tbody.innerHTML = '';
      if (stats.recentTransactions && stats.recentTransactions.length > 0) {
        stats.recentTransactions.forEach(tx => {
          const fineHtml = tx.finePaid ? `<span class="badge Lost">Rs ${tx.finePaid}</span>` : '-';
          const typeBadge = tx.type === 'Issue' ? `<span class="badge Loaned">Issue</span>` : `<span class="badge Available">Return</span>`;
          tbody.innerHTML += `
            <tr>
              <td>${typeBadge}</td>
              <td>${tx.bookTitle}</td>
              <td>${tx.memberName}</td>
              <td>${new Date(tx.date).toLocaleDateString()}</td>
              <td>${fineHtml}</td>
            </tr>
          `;
        });
      } else {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center">No recent transactions.</td></tr>`;
      }
    } catch (error) {
       console.error(error);
    }
  },

  async loadBooksView() {
    try {
      const books = await api.getBooks();
      this.state.books = books;
      const tbody = document.getElementById('books-tbody');
      tbody.innerHTML = '';
      if(books.length === 0) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center">No books found.</td></tr>`;
      
      books.forEach(book => {
        const cover = book.coverImage ? `<img src="${book.coverImage}" class="book-cover-img" />` : `<div style="width:40px;height:50px;background:#333;border-radius:4px;display:flex;align-items:center;justify-content:center"><i class='bx bx-book'></i></div>`;
        tbody.innerHTML += `
          <tr>
            <td>${cover}</td>
            <td><strong>${book.title}</strong></td>
            <td>${book.author}</td>
            <td>${book.isbn}</td>
            <td>${book.batchNumber}</td>
            <td><span class="badge ${book.status}">${book.status}</span></td>
            <td>
              <button class="btn btn-danger" onclick="app.deleteBook('${book.id}')"><i class='bx bx-trash'></i></button>
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
      const tbody = document.getElementById('members-tbody');
      tbody.innerHTML = '';
      if(members.length === 0) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center">No members found.</td></tr>`;
      
      members.forEach(member => {
        tbody.innerHTML += `
          <tr>
            <td><strong># ${member.memberCardId}</strong></td>
            <td>${member.name}</td>
            <td>${member.phone}</td>
            <td>${member.address}</td>
            <td>${new Date(member.createdAt).toLocaleDateString()}</td>
            <td>
              <button class="btn btn-danger" onclick="app.deleteMember('${member.id}')"><i class='bx bx-trash'></i></button>
            </td>
          </tr>
        `;
      });
    } catch (error) {
      console.error(error);
    }
  },

  async loadCirculationView() {
    try {
      // Refresh state for dropdowns
      this.state.books = await api.getBooks();
      this.state.members = await api.getMembers();

      const memberSelect = document.getElementById('issueMemberId');
      const issueBookSelect = document.getElementById('issueBookId');
      const returnBookSelect = document.getElementById('returnBookId');

      memberSelect.innerHTML = '<option value="">-- Select Member --</option>';
      this.state.members.forEach(m => {
        memberSelect.innerHTML += `<option value="${m.id}">${m.name} (${m.memberCardId})</option>`;
      });

      issueBookSelect.innerHTML = '<option value="">-- Select Available Book --</option>';
      returnBookSelect.innerHTML = '<option value="">-- Select Loaned Book --</option>';

      this.state.books.forEach(b => {
        if (b.status === 'Available') {
          issueBookSelect.innerHTML += `<option value="${b.id}">${b.title} (Batch: ${b.batchNumber})</option>`;
        } else if (b.status === 'Loaned') {
          returnBookSelect.innerHTML += `<option value="${b.id}">${b.title} (Batch: ${b.batchNumber})</option>`;
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
      isbn: document.getElementById('bookIsbn').value,
      batchNumber: parseInt(document.getElementById('bookBatch').value),
      coverImage: document.getElementById('bookCover').value,
    };
    try {
      await api.addBook(data);
      this.showToast('Book added successfully');
      this.closeModal('addBookModal');
      document.getElementById('addBookForm').reset();
      this.loadBooksView();
    } catch (error) {
      this.showToast(error.message, true);
    }
  },

  async deleteBook(id) {
    if(!confirm("Are you sure you want to delete this book?")) return;
    try {
        await api.deleteBook(id);
        this.showToast('Book deleted');
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
    };
    try {
      await api.addMember(data);
      this.showToast('Member registered successfully');
      this.closeModal('addMemberModal');
      document.getElementById('addMemberForm').reset();
      this.loadMembersView();
    } catch (error) {
      this.showToast(error.message, true);
    }
  },

  async deleteMember(id) {
    if(!confirm("Are you sure you want to delete this member?")) return;
    try {
        await api.deleteMember(id);
        this.showToast('Member deleted');
        this.loadMembersView();
    } catch (error) {
        this.showToast(error.message, true);
    }
  },

  async handleIssueBook(e) {
    e.preventDefault();
    const memberId = document.getElementById('issueMemberId').value;
    const bookId = document.getElementById('issueBookId').value;
    if(!memberId || !bookId) return this.showToast('Please select member and book', true);
    
    try {
      await api.issueBook(memberId, bookId);
      this.showToast('Book issued successfully for 14 days');
      document.getElementById('issueBookForm').reset();
      this.loadCirculationView(); // refresh lists
    } catch (error) {
      this.showToast(error.message, true);
    }
  },

  async handleReturnBook(e) {
    e.preventDefault();
    const bookId = document.getElementById('returnBookId').value;
    if(!bookId) return this.showToast('Please select a book', true);
    
    try {
      const res = await api.returnBook(bookId);
      let msg = 'Book returned successfully!';
      if(res.fine > 0) msg += ` Fine charged: Rs ${res.fine}`;
      this.showToast(msg, res.fine > 0);
      document.getElementById('returnBookForm').reset();
      this.loadCirculationView(); // refresh lists
    } catch (error) {
      this.showToast(error.message, true);
    }
  }
};

window.onload = () => app.init();
