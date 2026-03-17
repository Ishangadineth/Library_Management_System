"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { BookOpen, Users, ArrowLeftRight, AlertCircle } from "lucide-react";
import styles from "./page.module.css";

interface Stats {
  totalBooks: number;
  totalMembers: number;
  activeLoans: number;
  overdueLoans: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalBooks: 0,
    totalMembers: 0,
    activeLoans: 0,
    overdueLoans: 0,
  });
  });
  const [loading, setLoading] = useState(true);
  const { orgId } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      if (!db || !orgId) return;
      setLoading(true);
      try {
        const [booksSnap, membersSnap, loansSnap] = await Promise.all([
          getDocs(query(collection(db, "books"), where("orgId", "==", orgId))),
          getDocs(query(collection(db, "users"), where("role", "==", "member"), where("orgId", "==", orgId))),
          getDocs(query(collection(db, "transactions"), where("status", "==", "active"), where("orgId", "==", orgId))),
        ]);

        const now = new Date();
        let overdue = 0;
        loansSnap.forEach((doc) => {
          const data = doc.data();
          if (data.dueDate && data.dueDate.toDate() < now) overdue++;
        });

        setStats({
          totalBooks: booksSnap.size,
          totalMembers: membersSnap.size,
          activeLoans: loansSnap.size,
          overdueLoans: overdue,
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
      }
    };
    if (orgId) {
      fetchStats();
    }
  }, [orgId]);

  const statCards = [
    {
      id: "stat-total-books",
      label: "Total Books",
      value: stats.totalBooks,
      icon: BookOpen,
      color: "var(--primary)",
      bg: "rgba(139, 92, 246, 0.1)",
    },
    {
      id: "stat-total-members",
      label: "Total Members",
      value: stats.totalMembers,
      icon: Users,
      color: "var(--secondary)",
      bg: "rgba(59, 130, 246, 0.1)",
    },
    {
      id: "stat-active-loans",
      label: "Active Loans",
      value: stats.activeLoans,
      icon: ArrowLeftRight,
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.1)",
    },
    {
      id: "stat-overdue",
      label: "Overdue Books",
      value: stats.overdueLoans,
      icon: AlertCircle,
      color: "var(--accent)",
      bg: "rgba(244, 63, 94, 0.1)",
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>Dashboard</h1>
          <p className={styles.subheading}>Welcome back, Admin</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        {statCards.map(({ id, label, value, icon: Icon, color, bg }) => (
          <div id={id} key={id} className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: bg, color }}>
              <Icon size={24} />
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>{label}</p>
              <p className={styles.statValue}>
                {loading ? <span className={styles.shimmer} /> : value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actionsGrid}>
          <a href="/dashboard/books" className={styles.actionCard}>
            <BookOpen size={22} color="var(--primary)" />
            <span>Manage Books</span>
          </a>
          <a href="/dashboard/members" className={styles.actionCard}>
            <Users size={22} color="var(--secondary)" />
            <span>Manage Members</span>
          </a>
          <a href="/dashboard/circulation" className={styles.actionCard}>
            <ArrowLeftRight size={22} color="#10b981" />
            <span>Issue a Book</span>
          </a>
          <a href="/dashboard/fines" className={styles.actionCard}>
            <AlertCircle size={22} color="var(--accent)" />
            <span>View Fines</span>
          </a>
        </div>
      </div>
    </div>
  );
}
