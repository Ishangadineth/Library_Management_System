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
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Library size={32} color="var(--primary)" />
          <div>
            <h1>{libraryName.toUpperCase()} Library Catalog</h1>
            <p>Browse books available in this branch</p>
          </div>
        </div>
      </header>

      <div className={styles.searchContainer}>
        <div className={styles.searchWrapper}>
          <Search size={20} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by title, author, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      <main className={styles.main}>
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <BookOpen size={48} color="var(--text-muted)" />
            <p>No books match your search.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map((book) => (
              <div key={book.id} className={styles.bookCard}>
                <div className={styles.bookInfo}>
                  <h3 className={styles.bookTitle}>{book.title}</h3>
                  <p className={styles.bookAuthor}>by {book.author}</p>
                  <span className={styles.categoryBadge}>{book.category}</span>
                </div>
                
                <div className={styles.bookStatus}>
                  <div className={styles.availability}>
                    <span className={book.availableCopies > 0 ? styles.inStock : styles.outOfStock}>
                      {book.availableCopies > 0 ? 'Available' : 'Checked Out'}
                    </span>
                    <span className={styles.copyCount}>
                      {book.availableCopies} / {book.totalCopies} copies
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
