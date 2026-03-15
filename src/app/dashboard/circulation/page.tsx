"use client";
import { useEffect, useState } from "react";
import {
  collection, getDocs, addDoc, updateDoc, doc,
  serverTimestamp, query, orderBy, Timestamp, where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, CheckCircle, Clock, X, ArrowLeftRight } from "lucide-react";
import styles from "./circulation.module.css";

interface Transaction {
  id: string;
  bookId: string;
  bookTitle: string;
  memberName: string;
  memberId: string;
  issueDate: Timestamp;
  dueDate: Timestamp;
  returnDate: Timestamp | null;
  status: "active" | "returned";
}

interface Book { id: string; title: string; availableCopies: number; }
interface Member { id: string; name: string; }

const getDueDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d;
};

export default function CirculationPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ bookId: "", memberId: "" });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    if (!db) return;
    setLoading(true);
    const [txSnap, booksSnap, membersSnap] = await Promise.all([
      getDocs(query(collection(db, "transactions"), orderBy("issueDate", "desc"))),
      getDocs(collection(db, "books")),
      getDocs(query(collection(db, "users"), where("role", "==", "member"))),
    ]);
    setTransactions(txSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction)));
    setBooks(booksSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Book)));
    setMembers(membersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Member)));
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setSaving(true);
    const book = books.find((b) => b.id === form.bookId);
    const member = members.find((m) => m.id === form.memberId);
    if (!book || !member) return;
    try {
      await addDoc(collection(db, "transactions"), {
        bookId: form.bookId,
        bookTitle: book.title,
        memberId: form.memberId,
        memberName: member.name,
        issueDate: serverTimestamp(),
        dueDate: Timestamp.fromDate(getDueDate()),
        returnDate: null,
        status: "active",
      });
      await updateDoc(doc(db, "books", form.bookId), {
        availableCopies: book.availableCopies - 1,
      });
      setShowModal(false);
      setForm({ bookId: "", memberId: "" });
      await fetchAll();
    } finally {
      setSaving(false);
    }
  };

  const handleReturn = async (tx: Transaction) => {
    if (!db) return;
    if (!confirm(`Mark "${tx.bookTitle}" as returned?`)) return;
    await updateDoc(doc(db, "transactions", tx.id), {
      status: "returned",
      returnDate: serverTimestamp(),
    });
    const book = books.find((b) => b.id === tx.bookId);
    if (book) {
      await updateDoc(doc(db, "books", tx.bookId), {
        availableCopies: book.availableCopies + 1,
      });
    }
    await fetchAll();
  };

  const isOverdue = (tx: Transaction) =>
    tx.status === "active" && tx.dueDate && tx.dueDate.toDate() < new Date();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>Circulation</h1>
          <p className={styles.subheading}>Manage book issues and returns</p>
        </div>
        <button id="issue-book-btn" className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Issue Book
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingMsg}>Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div className={styles.emptyState}>
          <ArrowLeftRight size={48} color="var(--text-muted)" />
          <p>No transactions yet. Issue a book to get started.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Book</th>
                <th>Member</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className={styles.tableRow}>
                  <td className={styles.bookTitle}>{tx.bookTitle}</td>
                  <td>{tx.memberName}</td>
                  <td className={styles.date}>
                    {tx.issueDate ? tx.issueDate.toDate().toLocaleDateString() : "-"}
                  </td>
                  <td className={styles.date}>
                    {tx.dueDate ? tx.dueDate.toDate().toLocaleDateString() : "-"}
                  </td>
                  <td>
                    {tx.status === "returned" ? (
                      <span className={styles.statusReturned}>
                        <CheckCircle size={14} /> Returned
                      </span>
                    ) : isOverdue(tx) ? (
                      <span className={styles.statusOverdue}>
                        <Clock size={14} /> Overdue
                      </span>
                    ) : (
                      <span className={styles.statusActive}>
                        <Clock size={14} /> Active
                      </span>
                    )}
                  </td>
                  <td>
                    {tx.status === "active" && (
                      <button className={styles.returnBtn} onClick={() => handleReturn(tx)}>
                        Return
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Issue a Book</h2>
              <button onClick={() => setShowModal(false)} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleIssue} className={styles.form}>
              <div className={styles.field}>
                <label>Select Book *</label>
                <select
                  required
                  value={form.bookId}
                  onChange={(e) => setForm({ ...form, bookId: e.target.value })}
                >
                  <option value="">-- Choose a book --</option>
                  {books
                    .filter((b) => b.availableCopies > 0)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} ({b.availableCopies} available)
                      </option>
                    ))}
                </select>
              </div>
              <div className={styles.field}>
                <label>Select Member *</label>
                <select
                  required
                  value={form.memberId}
                  onChange={(e) => setForm({ ...form, memberId: e.target.value })}
                >
                  <option value="">-- Choose a member --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <p className={styles.dueDateInfo}>
                Due date will be set to <strong>14 days</strong> from today.
              </p>
              <div className={styles.formActions}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Issuing..." : "Issue Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
