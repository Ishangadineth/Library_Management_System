"use client";
import { useEffect, useState } from "react";
import {
  collection, getDocs, addDoc, deleteDoc, doc,
  serverTimestamp, query, orderBy, where,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { Plus, Trash2, Users, Search, X } from "lucide-react";
import styles from "./members.module.css";

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  joinedAt: { toDate: () => Date } | null;
}

const emptyForm = { name: "", email: "", phone: "", address: "", password: "" };

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [filtered, setFiltered] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchMembers = async () => {
    setLoading(true);
    const q = query(
      collection(db, "users"),
      where("role", "==", "member"),
      orderBy("name")
    );
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Member));
    setMembers(data);
    setFiltered(data);
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  useEffect(() => {
    const term = search.toLowerCase();
    setFiltered(
      term
        ? members.filter(
            (m) =>
              m.name.toLowerCase().includes(term) ||
              m.email.toLowerCase().includes(term)
          )
        : members
    );
  }, [search, members]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await addDoc(collection(db, "users"), {
        uid: cred.user.uid,
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        role: "member",
        joinedAt: serverTimestamp(),
      });
      setShowModal(false);
      setForm(emptyForm);
      await fetchMembers();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this member record?")) return;
    await deleteDoc(doc(db, "users", id));
    await fetchMembers();
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>Members</h1>
          <p className={styles.subheading}>{members.length} registered members</p>
        </div>
        <button id="add-member-btn" className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Add Member
        </button>
      </div>

      <div className={styles.searchWrapper}>
        <Search size={18} className={styles.searchIcon} />
        <input
          id="member-search"
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {loading ? (
        <div className={styles.loadingMsg}>Loading members...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <Users size={48} color="var(--text-muted)" />
          <p>No members found.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className={styles.tableRow}>
                  <td className={styles.nameCell}>
                    <div className={styles.avatar}>{m.name?.[0]?.toUpperCase()}</div>
                    {m.name}
                  </td>
                  <td>{m.email}</td>
                  <td>{m.phone || "-"}</td>
                  <td className={styles.date}>
                    {m.joinedAt ? m.joinedAt.toDate().toLocaleDateString() : "-"}
                  </td>
                  <td>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(m.id)}
                    >
                      <Trash2 size={16} />
                    </button>
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
              <h2>Register New Member</h2>
              <button onClick={() => setShowModal(false)} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdd} className={styles.form}>
              {[
                { label: "Full Name *", key: "name", type: "text", placeholder: "John Silva" },
                { label: "Email Address *", key: "email", type: "email", placeholder: "john@email.com" },
                { label: "Password *", key: "password", type: "password", placeholder: "Min 6 characters" },
                { label: "Phone", key: "phone", type: "tel", placeholder: "+94 77 123 4567" },
                { label: "Address", key: "address", type: "text", placeholder: "City, District" },
              ].map(({ label, key, type, placeholder }) => (
                <div className={styles.field} key={key}>
                  <label>{label}</label>
                  <input
                    type={type}
                    required={label.endsWith("*")}
                    placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}

              {error && <p className={styles.error}>{error}</p>}

              <div className={styles.formActions}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Registering..." : "Register Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
