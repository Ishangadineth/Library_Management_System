"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ArrowLeftRight,
  AlertCircle,
  Library,
  LogOut,
} from "lucide-react";
import styles from "./Sidebar.module.css";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/books", icon: BookOpen, label: "Books" },
  { href: "/dashboard/members", icon: Users, label: "Members" },
  { href: "/dashboard/circulation", icon: ArrowLeftRight, label: "Circulation" },
  { href: "/dashboard/fines", icon: AlertCircle, label: "Fines" },
];

export default function Sidebar() {
  const { logout } = useAuth();
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <Library size={28} color="var(--primary)" />
        <span>Lumina</span>
      </div>

      <nav className={styles.nav}>
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.navItem} ${active ? styles.active : ""}`}
            >
              <Icon size={20} />
              <span>{label}</span>
              {active && <div className={styles.activePill} />}
            </Link>
          );
        })}
      </nav>

      <button className={styles.logoutBtn} onClick={logout}>
        <LogOut size={18} />
        <span>Sign Out</span>
      </button>
    </aside>
  );
}
