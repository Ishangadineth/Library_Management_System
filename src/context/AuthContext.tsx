"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  role: string | null;
  orgId: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  orgId: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
      setUser(currentUser);
      if (currentUser && db) {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (snap.exists()) {
          setRole(snap.data().role || "member");
          setOrgId(snap.data().orgId || null);
        } else {
          setRole("member");
          setOrgId(null);
        }
      } else {
        setRole(null);
        setOrgId(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    if (!auth || !db) return;
    const result = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, "users", result.user.uid));
    const userData = snap.exists() ? snap.data() : null;
    const userRole = userData?.role || "member";
    const userOrgId = userData?.orgId || null;
    
    setRole(userRole);
    setOrgId(userOrgId);
    
    if (userRole === "admin" || userRole === "staff") router.push("/dashboard");
    else router.push("/catalog");
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, role, orgId, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
