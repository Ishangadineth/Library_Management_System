"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BookOpen, Search, Library } from "lucide-react";
import styles from "./catalog.module.css";
import React from "react";

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  publishedYear: string;
  availableCopies: number;
  totalCopies: number;
}

export default function CatalogPage({
  params,
}: {
  params: Promise<{ library: string }>;
}) {
  const [books, setBooks] = useState<Book[]>([]);
  const [filtered, setFiltered] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // React.use allows us to unwrap the dynamic route params safely
  const resolvedParams = React.use(params);
  const libraryName = resolvedParams.library.toLowerCase();

  useEffect(() => {
    const fetchCatalog = async () => {
      if (!db) return;
      try {
        // 1. First, find if this library exists and has public catalog enabled
        const orgQuery = query(
          collection(db, "users"),
          where("orgId", "==", libraryName),
          where("role", "in", ["admin", "superadmin", "staff"])
        );
        const orgSnap = await getDocs(orgQuery);

        if (orgSnap.empty) {
          setError("Library not found.");
          setLoading(false);
          return;
        }

        // Ideally we'd check a `public_catalog_enabled` flag on the org document here. 
        // For now, assuming it's enabled if the org matches.
        
        // 2. Fetch books for this orgId
        const booksQuery = query(
          collection(db, "books"),
          where("orgId", "==", libraryName)
        );
        const booksSnap = await getDocs(booksQuery);
        const data = booksSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Book));
        
        setBooks(data);
        setFiltered(data);
      } catch (err) {
        console.error("Error fetching public catalog:", err);
        setError("Failed to load catalog.");
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, [libraryName]);

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

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Library className={styles.pulseIcon} size={48} />
        <p>Loading {libraryName} catalog...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <Search size={48} color="var(--text-muted)" />
        <h2>{error}</h2>
        <p>The library you are looking for does not exist or has disabled public access.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Gradient Header - Similar to Storefront */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.storeIcon}>
            <Library size={32} />
          </div>
          <div className={styles.storeMeta}>
            <h1>{libraryName.toUpperCase()}</h1>
            <p>Welcome to our official digital library collection</p>
          </div>
        </div>
      </header>

      <div className={styles.contentArea}>
        {/* Centered Search Bar */}
        <div className={styles.searchWrapper}>
          <div className={styles.searchBox}>
            <Search size={20} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search for books..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        <main className={styles.main}>
          {filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <BookOpen size={48} color="rgba(0,0,0,0.1)" />
              <p>No books available in this catalog.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {filtered.map((book) => (
                <div key={book.id} className={styles.card}>
                  <div className={styles.imagePlaceholder}>
                    {/* Simplified cover representation */}
                    <BookOpen size={64} color="rgba(79, 70, 229, 0.4)" />
                  </div>
                  <div className={styles.cardMeta}>
                    <h3>{book.title}</h3>
                    <p className={styles.author}>by {book.author}</p>
                    <div className={styles.footerFlex}>
                       <span className={book.availableCopies > 0 ? styles.inStock : styles.outOfStock}>
                         {book.availableCopies > 0 ? "Available" : "Checked Out"}
                       </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <footer className={styles.footer}>
          <p>Powered by <strong>Shamod Library System</strong></p>
        </footer>
      </div>
    </div>
  );
}
