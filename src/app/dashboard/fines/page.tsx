"use client";
import { useEffect, useState } from "react";
import {
  collection, getDocs, query, orderBy, where, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AlertCircle } from "lucide-react";
import styles from "./fines.module.css";

interface Transaction {
  id: string;
  bookTitle: string;
  memberName: string;
  dueDate: Timestamp;
  status: string;
}

const FINE_PER_DAY = 10; // Rs. 10 per day

function calcFine(dueDate: Timestamp): number {
  const now = new Date();
  const due = dueDate.toDate();
  if (now <= due) return 0;
  const diffMs = now.getTime() - due.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return days * FINE_PER_DAY;
}

export default function FinesPage() {
  const [overdue, setOverdue] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const q = query(
        collection(db, "transactions"),
        where("status", "==", "active"),
        orderBy("dueDate", "asc")
      );
      const snap = await getDocs(q);
      const now = new Date();
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Transaction))
        .filter((tx) => tx.dueDate && tx.dueDate.toDate() < now);
      setOverdue(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const total = overdue.reduce((sum, tx) => sum + calcFine(tx.dueDate), 0);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>Fines</h1>
          <p className={styles.subheading}>{overdue.length} overdue books</p>
        </div>
        {overdue.length > 0 && (
          <div className={styles.totalBadge}>
            Total Fines: <strong>Rs. {total.toLocaleString()}</strong>
          </div>
        )}
      </div>

      {loading ? (
        <div className={styles.loadingMsg}>Calculating fines...</div>
      ) : overdue.length === 0 ? (
        <div className={styles.emptyState}>
          <AlertCircle size={48} color="var(--text-muted)" />
          <p>No overdue books. Great job!</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Book</th>
                <th>Member</th>
                <th>Due Date</th>
                <th>Days Overdue</th>
                <th>Fine (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {overdue.map((tx) => {
                const fine = calcFine(tx.dueDate);
                const due = tx.dueDate.toDate();
                const days = Math.ceil((new Date().getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <tr key={tx.id} className={styles.tableRow}>
                    <td className={styles.bookTitle}>{tx.bookTitle}</td>
                    <td>{tx.memberName}</td>
                    <td className={styles.date}>{due.toLocaleDateString()}</td>
                    <td>
                      <span className={styles.daysBadge}>{days} days</span>
                    </td>
                    <td className={styles.fineAmount}>Rs. {fine.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
