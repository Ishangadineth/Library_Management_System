const API_BASE_URL = '/api';

const api = {
  // Books API
  async getBooks() {
    const res = await fetch(`${API_BASE_URL}/books`);
    return res.json();
  },
  async getBook(id) {
    const res = await fetch(`${API_BASE_URL}/books/${id}`);
    return res.json();
  },
  async checkIsbnExist(isbn) {
    const res = await fetch(`${API_BASE_URL}/books/check-isbn/${isbn}`);
    return res.json();
  },
  async addBook(bookData) {
    const res = await fetch(`${API_BASE_URL}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookData)
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
  async updateBook(id, data) {
    const res = await fetch(`${API_BASE_URL}/books/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  async deleteBook(id) {
    const res = await fetch(`${API_BASE_URL}/books/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  // Members API
  async getMembers() {
    const res = await fetch(`${API_BASE_URL}/members`);
    return res.json();
  },
  async getMemberByCardId(cardId) {
    const res = await fetch(`${API_BASE_URL}/members/by-card/${cardId}`);
    if (!res.ok) return null;
    return res.json();
  },
  async getMemberHistoryByCard(cardId) {
    const res = await fetch(`${API_BASE_URL}/members/by-card/${cardId}/history`);
    return res.json();
  },
  async addMember(memberData) {
    const res = await fetch(`${API_BASE_URL}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memberData)
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
  async deleteMember(id) {
    const res = await fetch(`${API_BASE_URL}/members/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
  async getMemberHistory(id) {
    const res = await fetch(`${API_BASE_URL}/members/${id}/history`);
    return res.json();
  },

  // Cart API
  async getMemberCart(cardId) {
    const res = await fetch(`${API_BASE_URL}/members/by-card/${cardId}/cart`);
    return res.json();
  },
  async addToMemberCart(cardId, bookData) {
    const res = await fetch(`${API_BASE_URL}/members/by-card/${cardId}/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookData)
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
  async removeFromCart(cartItemId) {
    const res = await fetch(`${API_BASE_URL}/members/cart/${cartItemId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
  async getAllCartItems() {
    const res = await fetch(`${API_BASE_URL}/members/cart/all`);
    return res.json();
  },

  // Circulation API
  async issueBook(memberId, bookId, adminName, adminEmail) {
    const res = await fetch(`${API_BASE_URL}/circulation/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, bookId, adminName, adminEmail })
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
  async returnBook(bookId, adminName, adminEmail) {
    const res = await fetch(`${API_BASE_URL}/circulation/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId, adminName, adminEmail })
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
  async getBookHistory(bookId) {
    const res = await fetch(`${API_BASE_URL}/circulation/history/${bookId}`);
    return res.json();
  },

  // Dashboard API
  async getDashboardStats() {
    const res = await fetch(`${API_BASE_URL}/dashboard/stats`);
    return res.json();
  }
};
