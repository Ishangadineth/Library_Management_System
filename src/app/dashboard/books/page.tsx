"use client";
import { useEffect, useState } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, Pencil, Trash2, X, BookOpen, Search } from "lucide-react";
import styles from "./books.module.css";

interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  isbn: string;
  totalCopies: number;
  availableCopies: number;
  coverUrl: string;
}

const emptyForm = {
  title: "", author: "", category: "", isbn: "",
  totalCopies: 1, availableCopies: 1, coverUrl: "",
};

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [filtered, setFiltered] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchBooks = async () => {
    if (!db) return;
    setLoading(true);
    const q = query(collection(db, "books"), orderBy("title"));
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Book));
    setBooks(data);
    setFiltered(data);
    setLoading(false);
  };

  useEffect(() => { fetchBooks(); }, []);

  useEffect(() => {
    const term = search.toLowerCase();
    setFiltered(
      term
        ? books.filter(
            (b) =>
              b.title.toLowerCase().includes(term) ||
              b.author.toLowerCase().includes(term) ||
              b.category.toLowerCase().includes(term)
          )
        : books
    );
  }, [search, books]);

  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowModal(true);
  };

  const openEdit = (book: Book) => {
    setForm({
      title: book.title,
      author: book.author,
      category: book.category,
      isbn: book.isbn,
      totalCopies: book.totalCopies,
      availableCopies: book.availableCopies,
      coverUrl: book.coverUrl || "",
    });
    setEditId(book.id);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setSaving(true);
    try {
      if (editId) {
        await updateDoc(doc(db, "books", editId), { ...form });
      } else {
        await addDoc(collection(db, "books"), {
          ...form,
          createdAt: serverTimestamp(),
        });
      }
      setShowModal(false);
      await fetchBooks();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    if (!confirm("Are you sure you want to delete this book?")) return;
    await deleteDoc(doc(db, "books", id));
    await fetchBooks();
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>Books</h1>
          <p className={styles.subheading}>{books.length} books in catalog</p>
        </div>
        <button id="add-book-btn" className="btn-primary" onClick={openAdd}>
          <Plus size={18} /> Add Book
        </button>
      </div>

      {/* Search */}
      <div className={styles.searchWrapper}>
        <Search size={18} className={styles.searchIcon} />
        <input
          id="book-search"
          type="text"
          placeholder="Search by title, author or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Books Table */}
      {loading ? (
        <div className={styles.loadingMsg}>Loading books...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <BookOpen size={48} color="var(--text-muted)" />
          <p>No books found. Add your first book!</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Category</th>
                <th>ISBN</th>
                <th>Copies</th>
                <th>Available</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((book) => (
                <tr key={book.id} className={styles.tableRow}>
                  <td className={styles.titleCell}>{book.title}</td>
                  <td>{book.author}</td>
                  <td>
                    <span className={styles.badge}>{book.category}</span>
                  </td>
                  <td className={styles.isbn}>{book.isbn}</td>
                  <td>{book.totalCopies}</td>
                  <td>
                    <span
                      className={styles.availability}
                      style={{
                        color:
                          book.availableCopies === 0
                            ? "var(--accent)"
                            : "#10b981",
                      }}
                    >
                      {book.availableCopies}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.editBtn}
                        onClick={() => openEdit(book)}
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(book.id)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editId ? "Edit Book" : "Add New Book"}</h2>
              <button onClick={() => setShowModal(false)} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Title *</label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Book title"
                  />
                </div>
                <div className={styles.field}>
                  <label>Author *</label>
                  <input
                    required
                    value={form.author}
                    onChange={(e) => setForm({ ...form, author: e.target.value })}
                    placeholder="Author name"
                  />
                </div>
                <div className={styles.field}>
                  <label>Category *</label>
                  <input
                    required
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Fiction, Science"
                  />
                </div>
                <div className={styles.field}>
                  <label>ISBN</label>
                  <input
                    value={form.isbn}
                    onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                    placeholder="ISBN number"
                  />
                </div>
                <div className={styles.field}>
                  <label>Total Copies *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={form.totalCopies}
                    onChange={(e) =>
                      setForm({ ...form, totalCopies: Number(e.target.value) })
                    }
                  />
                </div>
                <div className={styles.field}>
                  <label>Available Copies *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.availableCopies}
                    onChange={(e) =>
                      setForm({ ...form, availableCopies: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label>Cover Image URL</label>
                <input
                  value={form.coverUrl}
                  onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Saving..." : editId ? "Update Book" : "Add Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
