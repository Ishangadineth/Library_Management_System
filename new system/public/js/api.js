const API_BASE_URL = '/api';

const api = {
  // Books API
  async getBooks() {
    const res = await fetch(`${API_BASE_URL}/books`);
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

  // Circulation API
  async issueBook(memberId, bookId) {
    const res = await fetch(`${API_BASE_URL}/circulation/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, bookId })
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
  async returnBook(bookId) {
    const res = await fetch(`${API_BASE_URL}/circulation/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId })
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  // Dashboard API
  async getDashboardStats() {
    const res = await fetch(`${API_BASE_URL}/dashboard/stats`);
    return res.json();
  }
};
