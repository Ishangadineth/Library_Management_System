import { BookOpen, Search, LogIn, Library } from "lucide-react";

export default function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '2rem' }}>
      
      {/* Top Navbar */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
          <Library color="var(--primary)" size={32} />
          Lumina
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-secondary">Catalog</button>
          <button className="btn-primary">
            <LogIn size={18} /> Login
          </button>
        </div>
      </nav>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '2rem' }}>
        <h1 style={{ fontSize: '4rem', fontWeight: 800, background: 'linear-gradient(to right, #8b5cf6, #3b82f6)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
          Next-Generation Library System
        </h1>
        
        <p style={{ maxWidth: 600, fontSize: '1.25rem', color: 'var(--text-muted)' }}>
          Discover millions of books, reserve your favorites instantly, and manage your library seamlessly with the power of modern web technologies.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
            <Search size={20} />
            Explore Catalog
          </button>
          <button className="btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
            <BookOpen size={20} />
            Members Area
          </button>
        </div>

        <div className="glass-panel" style={{ marginTop: '4rem', padding: '2rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4rem', textAlign: 'left' }}>
           <div>
              <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Lightning Fast</h3>
              <p className="text-muted">Built on Next.js 14 and highly optimized Edge network.</p>
           </div>
           <div>
              <h3 style={{ color: 'var(--secondary)', marginBottom: '0.5rem' }}>Real-time Sync</h3>
              <p className="text-muted">Firestore Database ensures you always see availability as it happens.</p>
           </div>
           <div>
              <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>Cross-Platform</h3>
              <p className="text-muted">Enjoy a consistent experience across Web and Android device app.</p>
           </div>
        </div>

      </main>

    </div>
  );
}
