const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'my idea/stitch_issue_return_portal');

function readFile(subpath) {
    try {
        return fs.readFileSync(path.join(srcDir, subpath, 'code.html'), 'utf-8');
    } catch(e) {
        return '';
    }
}

// Extract body contents
function getBody(html) {
    const start = html.indexOf('<body');
    const end = html.lastIndexOf('</body>');
    if (start === -1 || end === -1) return '';
    const bodyMatch = html.substring(start, end + 7);
    const contentStart = bodyMatch.indexOf('>') + 1;
    const contentEnd = bodyMatch.lastIndexOf('</body>');
    return bodyMatch.substring(contentStart, contentEnd);
}

// Extract head config
function getHeadInfo() {
    return `
    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
    
    <script>
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#001e40",
                        "primary-container": "#003366",
                        "on-primary": "#ffffff",
                        "on-surface": "#1a1c1f",
                        "on-surface-variant": "#43474f",
                        "surface": "#f9f9fe",
                        "surface-container": "#eeedf2",
                        "surface-container-low": "#f4f3f8",
                        "surface-container-highest": "#e2e2e7",
                        "surface-container-high": "#e8e8ed",
                        "surface-container-lowest": "#ffffff",
                        "outline": "#737780",
                        "outline-variant": "#c3c6d1",
                        "secondary": "#48626e",
                        "secondary-container": "#cbe7f5",
                        "on-secondary-container": "#4e6874",
                        "error": "#ba1a1a",
                        "error-container": "#ffdad6",
                        "on-error-container": "#93000a",
                        "primary-fixed": "#d5e3ff",
                        "primary-fixed-dim": "#a7c8ff",
                        "on-primary-fixed-variant": "#1f477b",
                        "secondary-fixed": "#cbe7f5",
                        "secondary-fixed-dim": "#afcbd8",
                        "on-secondary-fixed-variant": "#304a55",
                        "tertiary": "#381300",
                        "tertiary-fixed": "#ffdbca",
                        "on-tertiary-fixed-variant": "#723610",
                        "surface-variant": "#e2e2e7",
                        "surface-tint": "#3a5f94"
                    },
                    fontFamily: {
                        "headline": ["Manrope"],
                        "body": ["Inter"],
                        "label": ["Inter"]
                    }
                }
            }
        }
    </script>
    <style>
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        .admin-only { display: none !important; }
        body.is-admin .admin-only { display: block !important; }
        body.is-admin .admin-flex { display: flex !important; }
        body.is-admin .public-only { display: none !important; }
        
        /* Modals and Toasts Base (Tailwind compatible) */
        .modal { display: none; position: fixed; z-index: 100; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.5); backdrop-filter: blur(4px); }
        .modal.active { display: flex; align-items: center; justify-content: center; }
        .toast { visibility: hidden; min-width: 250px; background-color: #333; color: #fff; text-align: center; border-radius: 8px; padding: 16px; position: fixed; z-index: 200; right: 20px; bottom: 30px; font-size: 14px; opacity: 0; transition: opacity 0.3s; }
        .toast.show { visibility: visible; opacity: 1; }
        .toast.error { background-color: #ba1a1a; }
        
        .view.d-none { display: none !important; }
    </style>
    `;
}

// Build index.html
function buildIndex() {
    const pubHtml = getBody(readFile('public_library_catalog'));
    const dashHtml = getBody(readFile('librarian_dashboard'));
    const invHtml = getBody(readFile('book_inventory'));
    const memHtml = getBody(readFile('member_management'));
    const irHtml = getBody(readFile('issue_return_portal'));
    
    // We can't just inject raw HTML directly without structure.
    // Let's create an orchestrated index.html.

    const finalHtml = \`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Academic Curator - Library System</title>
    \${getHeadInfo()}
</head>
<body class="bg-background font-body text-on-surface flex flex-col min-h-screen">

    <!-- Loading Screen -->
    <div id="loading-screen" class="fixed inset-0 z-[1000] bg-surface flex flex-col items-center justify-center transition-opacity duration-500">
        <span class="material-symbols-outlined animate-spin text-primary text-6xl">refresh</span>
        <h2 class="mt-4 font-headline text-2xl text-primary font-bold">The Academic Curator</h2>
        <p class="text-on-surface-variant font-body">Initializing workspace...</p>
    </div>

    <!-- ============================================== -->
    <!-- PUBLIC LAYOUT (Visible when NOT admin) -->
    <!-- ============================================== -->
    <div id="public-layout" class="public-only flex flex-col flex-1 w-full">
        <!-- Public Top Nav -->
        <nav class="sticky top-0 z-50 flex justify-between items-center w-full px-8 py-4 bg-surface/90 backdrop-blur-sm border-b border-outline-variant/15">
            <div class="flex items-center gap-8">
                <span class="text-2xl font-bold font-headline text-primary tracking-tight">The Academic Curator</span>
            </div>
            <div class="flex-1 max-w-md mx-8 hidden lg:block">
                <div class="relative group">
                    <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                    <input type="text" id="global-search-public" class="w-full bg-surface-container-highest border-none rounded-xl py-2 pl-10 pr-4 focus:ring-2 focus:ring-surface-tint outline-none text-sm" placeholder="Search for books, authors..."/>
                </div>
            </div>
            <div class="flex items-center gap-4">
                <button id="login-btn" class="px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-xl font-semibold hover:opacity-90 transition-all font-body text-sm flex items-center gap-2">
                    <span class="material-symbols-outlined text-sm">login</span> Sign In / Admin
                </button>
                <i id="theme-toggle" class="material-symbols-outlined cursor-pointer hover:text-primary">dark_mode</i>
            </div>
        </nav>

        <div class="flex flex-1">
            <!-- Public Filters Sidebar -->
            <aside class="hidden md:flex flex-col gap-4 p-6 w-64 bg-surface-container-low h-[calc(100vh-80px)] sticky top-20 border-r border-outline-variant/10">
                <div class="mb-6">
                    <h3 class="font-headline text-sm font-bold uppercase tracking-wider text-primary">Filters</h3>
                    <p class="text-xs text-on-surface-variant mt-1">Refine Collection</p>
                </div>
                <nav class="flex flex-col gap-1 flex-1">
                    <button class="filter-btn active flex items-center gap-3 px-4 py-3 text-primary font-bold bg-white rounded-lg cursor-pointer text-sm font-headline uppercase" data-filter="all">
                        <span class="material-symbols-outlined">auto_stories</span> All Genres
                    </button>
                    <button class="filter-btn flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high transition-all rounded-lg cursor-pointer text-sm font-headline uppercase" data-filter="Fiction">
                        <span class="material-symbols-outlined">star</span> Fiction
                    </button>
                    <button class="filter-btn flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high transition-all rounded-lg cursor-pointer text-sm font-headline uppercase" data-filter="Science">
                        <span class="material-symbols-outlined">science</span> Science
                    </button>
                    <button class="filter-btn flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high transition-all rounded-lg cursor-pointer text-sm font-headline uppercase" data-filter="Technology">
                        <span class="material-symbols-outlined">computer</span> Technology
                    </button>
                    <button class="filter-btn flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high transition-all rounded-lg cursor-pointer text-sm font-headline uppercase" data-filter="History">
                        <span class="material-symbols-outlined">history_edu</span> History
                    </button>
                </nav>
            </aside>

            <!-- Public Main -->
            <main class="flex-1 p-8 lg:p-12">
                <header class="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div class="max-w-2xl">
                        <h1 class="text-4xl font-headline font-extrabold tracking-tight text-primary mb-2">Digital Library Catalog</h1>
                        <p class="text-on-surface-variant text-lg font-body">Access scholarly works and rare manuscripts from our archive.</p>
                    </div>
                    <div class="flex items-center gap-4">
                        <span class="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Sort</span>
                        <select onchange="app.sortBooks(this.value)" class="bg-surface-container-low border-none rounded-xl py-2 pl-4 pr-10 text-sm font-bold text-primary focus:ring-2 focus:ring-surface-tint cursor-pointer">
                            <option value="newest">Newest Arrivals</option>
                            <option value="title">Title (A-Z)</option>
                            <option value="author">Author (A-Z)</option>
                        </select>
                    </div>
                </header>
                <!-- Dynamic Books Grid -->
                <div id="dashboard-books-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    <!-- Books Rendered Here -->
                </div>
            </main>
        </div>
        
        <footer class="w-full py-8 px-8 flex justify-between items-center bg-primary text-white font-body text-xs mt-auto">
            <span class="text-lg font-headline font-bold">The Academic Curator</span>
            <p class="opacity-70">&copy; 2024 The Academic Curator. Production v1.2.4-stable</p>
        </footer>
    </div>


    <!-- ============================================== -->
    <!-- ADMIN LAYOUT (Visible when body.is-admin) -->
    <!-- ============================================== -->
    <div id="admin-layout" class="admin-only flex w-full flex-1">
        
        <!-- Admin SideNav -->
        <aside class="h-screen w-64 fixed left-0 top-0 bg-surface-container-low flex flex-col py-8 z-50 border-r border-outline-variant/15">
            <div class="px-6 mb-10">
                <h1 class="text-2xl font-bold font-headline text-primary tracking-tight">Academic Curator</h1>
                <p class="text-xs text-on-surface-variant font-medium mt-1">Administration</p>
            </div>
            <nav class="flex-1 space-y-1 nav-links">
                <a href="#" data-target="dashboard-view" class="active flex items-center px-6 py-3 bg-white text-primary rounded-r-full shadow-sm font-headline font-bold tracking-wide text-sm">
                    <span class="material-symbols-outlined mr-3">dashboard</span> Dashboard
                </a>
                <a href="#" data-target="inventory-view" class="flex items-center px-6 py-3 text-on-surface-variant hover:bg-surface-container-high transition-colors font-headline font-semibold tracking-wide text-sm">
                    <span class="material-symbols-outlined mr-3">library_books</span> Book Inventory
                </a>
                <a href="#" data-target="members-view" class="flex items-center px-6 py-3 text-on-surface-variant hover:bg-surface-container-high transition-colors font-headline font-semibold tracking-wide text-sm">
                    <span class="material-symbols-outlined mr-3">group</span> Members
                </a>
                <a href="#" data-target="circulation-view" class="flex items-center px-6 py-3 text-on-surface-variant hover:bg-surface-container-high transition-colors font-headline font-semibold tracking-wide text-sm">
                    <span class="material-symbols-outlined mr-3">swap_horiz</span> Issue/Return
                </a>
            </nav>
            <div class="px-6 mt-auto space-y-3">
                <button onclick="document.body.classList.remove('is-admin');" class="w-full py-3 px-4 bg-error-container text-on-error-container rounded-xl font-headline font-bold flex items-center justify-center space-x-2">
                    <span class="material-symbols-outlined text-sm">logout</span> <span>Logout</span>
                </button>
            </div>
        </aside>

        <!-- Admin Main Content Area -->
        <div class="flex-1 ml-64 flex flex-col min-h-screen">
            <!-- Admin TopNav -->
            <header class="sticky top-0 w-full h-16 bg-surface/90 backdrop-blur-md flex items-center justify-between px-8 z-40 border-b border-outline-variant/15">
                <div class="flex items-center flex-1">
                    <div class="relative w-full max-w-md">
                        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl">search</span>
                        <input id="global-search-admin" class="w-full bg-surface-container-highest border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-surface-tint outline-none" placeholder="Search archives..." type="text"/>
                    </div>
                </div>
                <div class="flex items-center space-x-6">
                    <span id="live-clock" class="font-mono text-sm text-on-surface-variant font-bold"></span>
                    <i id="theme-toggle-admin" class="material-symbols-outlined cursor-pointer hover:text-primary">dark_mode</i>
                    <div class="flex items-center space-x-3">
                        <span class="text-sm font-headline font-bold text-primary">Admin Control</span>
                        <div class="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold">AD</div>
                    </div>
                </div>
            </header>

            <!-- Views Container -->
            <main class="flex-1 p-10 bg-surface views-container">
                
                <!-- Dashboard View -->
                <div id="dashboard-view" class="view active">
                    <div class="mb-10 flex justify-between items-end">
                        <div>
                            <h2 class="text-3xl font-headline font-extrabold text-primary tracking-tight">Curator's Overview</h2>
                            <p class="text-on-surface-variant font-label mt-1">System Administration Status</p>
                        </div>
                    </div>
                    <!-- Stats Grid -->
                    <div class="grid grid-cols-4 gap-6 mb-12" id="stats-grid">
                        <div class="col-span-1 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10">
                            <h3 class="text-on-surface-variant text-xs font-headline font-bold uppercase mb-1">Total Books</h3>
                            <div class="text-3xl font-headline font-extrabold text-primary" id="stat-total-books">0</div>
                        </div>
                        <div class="col-span-1 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10">
                            <h3 class="text-on-surface-variant text-xs font-headline font-bold uppercase mb-1">Borrowed</h3>
                            <div class="text-3xl font-headline font-extrabold text-secondary" id="stat-borrowed">0</div>
                        </div>
                        <div class="col-span-1 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10">
                            <h3 class="text-on-surface-variant text-xs font-headline font-bold uppercase mb-1">Overdue</h3>
                            <div class="text-3xl font-headline font-extrabold text-error" id="stat-overdue">0</div>
                        </div>
                        <div class="col-span-1 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10">
                            <h3 class="text-on-surface-variant text-xs font-headline font-bold uppercase mb-1">Members</h3>
                            <div class="text-3xl font-headline font-extrabold text-primary" id="stat-members">0</div>
                        </div>
                    </div>
                </div>

                <!-- Inventory View -->
                <div id="inventory-view" class="view d-none">
                    <div class="flex items-end justify-between mb-8">
                        <div>
                            <h2 class="text-3xl font-headline font-extrabold text-primary">Book Inventory</h2>
                            <p class="text-on-surface-variant">Manage the academic collection.</p>
                        </div>
                        <button onclick="app.openModal('addBookModal')" class="px-6 py-2 bg-primary text-white rounded-xl font-bold flex items-center space-x-2">
                            <span class="material-symbols-outlined text-sm">add</span> <span>Add Book</span>
                        </button>
                    </div>
                    <div class="bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/10">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-surface-container-low">
                                    <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Book Details</th>
                                    <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">ISBN</th>
                                    <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Availability</th>
                                </tr>
                            </thead>
                            <tbody id="books-table-body" class="divide-y divide-outline-variant/10">
                                <!-- Books populated via app.js -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Members View -->
                <div id="members-view" class="view d-none">
                    <div class="flex items-end justify-between mb-8">
                        <div>
                            <h2 class="text-3xl font-headline font-extrabold text-primary">Member Registers</h2>
                        </div>
                        <button onclick="app.openModal('addMemberModal')" class="px-6 py-2 bg-primary text-white rounded-xl font-bold flex items-center space-x-2">
                            <span class="material-symbols-outlined text-sm">person_add</span> <span>Add Member</span>
                        </button>
                    </div>
                    <div class="bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/10">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-surface-container-low">
                                    <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Member Details</th>
                                    <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Card ID</th>
                                </tr>
                            </thead>
                            <tbody id="members-table-body" class="divide-y divide-outline-variant/10">
                                <!-- Members populated via app.js -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Circulation View -->
                <div id="circulation-view" class="view d-none">
                    <div class="flex items-end justify-between mb-8">
                        <div>
                            <h2 class="text-3xl font-headline font-extrabold text-primary">Issue/Return Portal</h2>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-8">
                        <!-- Issue Form -->
                        <div class="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/10">
                            <h3 class="text-xl font-bold text-primary mb-6">Issue Book</h3>
                            <form id="borrowBookForm" class="space-y-4">
                                <input type="text" id="borrowMemberId" placeholder="Member Card ID (Scan)" class="w-full bg-surface-container-low px-4 py-3 rounded-xl border-none font-mono text-sm" required>
                                <input type="text" id="borrowBookId" placeholder="Book ISBN (Scan)" class="w-full bg-surface-container-low px-4 py-3 rounded-xl border-none font-mono text-sm" required>
                                <button type="submit" class="w-full py-3 bg-primary text-white font-bold rounded-xl mt-4">Process Issue</button>
                            </form>
                        </div>
                        <!-- Return Form -->
                        <div class="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/10">
                            <h3 class="text-xl font-bold text-secondary mb-6">Return Book</h3>
                            <form id="returnBookForm" class="space-y-4">
                                <input type="text" id="returnBookId" placeholder="Book ISBN (Scan)" class="w-full bg-surface-container-low px-4 py-3 rounded-xl border-none font-mono text-sm" required>
                                <button type="submit" class="w-full py-3 bg-secondary text-white font-bold rounded-xl mt-4">Process Return</button>
                            </form>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    </div>


    <!-- ============================================== -->
    <!-- MODALS & OVERLAYS -->
    <!-- ============================================== -->

    <div id="addBookModal" class="modal">
        <div class="bg-surface-container-lowest p-8 rounded-2xl max-w-lg w-full shadow-2xl m-4 relative">
            <span class="material-symbols-outlined absolute top-4 right-4 cursor-pointer text-outline hover:text-primary" onclick="app.closeModal('addBookModal')">close</span>
            <h2 class="text-2xl font-bold text-primary mb-6 font-headline">Add Inventory Entry</h2>
            <form id="addBookForm" class="space-y-4">
                <input type="text" id="bookIsbn" required placeholder="ISBN" class="w-full bg-surface-container px-4 py-2 rounded-lg border-none">
                <input type="number" id="bookBatch" value="1" required placeholder="Batch" class="w-full bg-surface-container px-4 py-2 rounded-lg border-none">
                <input type="text" id="bookTitle" required placeholder="Title" class="w-full bg-surface-container px-4 py-2 rounded-lg border-none">
                <input type="text" id="bookAuthor" required placeholder="Author" class="w-full bg-surface-container px-4 py-2 rounded-lg border-none">
                <input type="text" id="bookPublisher" placeholder="Publisher" class="w-full bg-surface-container px-4 py-2 rounded-lg border-none">
                <select id="bookCategory" class="w-full bg-surface-container px-4 py-2 rounded-lg border-none">
                    <option value="Fiction">Fiction</option>
                    <option value="Science">Science</option>
                    <option value="Technology">Technology</option>
                    <option value="History">History</option>
                </select>
                <input type="url" id="bookCover" placeholder="Cover Image URL (optional)" class="w-full bg-surface-container px-4 py-2 rounded-lg border-none">
                <button type="submit" class="w-full py-3 bg-primary text-white font-bold rounded-xl">Save Entry</button>
            </form>
        </div>
    </div>

    <!-- Details Modal structure updated to match Tailwind -->
    <div id="bookDetailModal" class="modal">
        <div class="bg-surface-container-lowest p-8 rounded-2xl max-w-2xl w-full shadow-2xl m-4 relative flex gap-6">
            <span class="material-symbols-outlined absolute top-4 right-4 cursor-pointer text-outline hover:text-primary z-10" onclick="app.closeModal('bookDetailModal')">close</span>
            
            <div class="w-1/3 flex flex-col gap-4">
                <div id="detail-cover-container" class="rounded-xl overflow-hidden shadow-md"></div>
                <div id="detail-qr-container" class="flex justify-center bg-white p-2 rounded-xl border border-outline-variant/20"></div>
            </div>
            
            <div class="w-2/3 flex flex-col max-h-[70vh] overflow-y-auto pr-4">
                <h2 id="detail-title" class="text-2xl font-bold text-primary font-headline leading-tight">Book Title</h2>
                <p id="detail-author" class="text-sm font-bold text-on-surface-variant mb-2">Author Name</p>
                <span id="detail-status" class="inline-block px-3 py-1 bg-primary-container text-white text-xs font-bold rounded-full w-max mb-4">Status</span>
                
                <div class="grid grid-cols-2 gap-4 bg-surface-container-low p-4 rounded-xl mb-4">
                    <div>
                        <p class="text-xs text-on-surface-variant font-bold uppercase">ISBN</p>
                        <p id="detail-isbn" class="text-sm font-mono text-primary">--</p>
                    </div>
                    <div>
                        <p class="text-xs text-on-surface-variant font-bold uppercase">Batch</p>
                        <p id="detail-batch" class="text-sm text-primary">--</p>
                    </div>
                    <div>
                        <p class="text-xs text-on-surface-variant font-bold uppercase">Category</p>
                        <p id="detail-category" class="text-sm text-primary">--</p>
                    </div>
                    <div>
                        <p class="text-xs text-on-surface-variant font-bold uppercase">Publisher</p>
                        <p id="detail-publisher" class="text-sm text-primary">--</p>
                    </div>
                </div>

                <div class="admin-only bg-surface-container-high p-4 rounded-xl mb-4">
                    <p class="text-xs font-bold text-primary uppercase mb-2">Librarian Notes</p>
                    <textarea id="detail-notes" class="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg p-3 text-sm" rows="3"></textarea>
                    <button onclick="app.saveBookNotes()" class="mt-2 text-xs bg-primary text-white px-4 py-2 rounded-lg font-bold">Save Notes</button>
                </div>
                
                <div>
                    <p class="text-sm font-bold text-primary mb-2">Borrowing History</p>
                    <table class="w-full text-left text-xs">
                        <thead>
                            <tr class="border-b border-outline-variant/20">
                                <th class="py-2">Member</th>
                                <th>Issued</th>
                                <th>Returned</th>
                            </tr>
                        </thead>
                        <tbody id="detail-history-body"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <div id="toast" class="toast"></div>

    <script src="js/firebase-client.js"></script>
    <script src="js/api.js"></script>
    <!-- Update app.js selectors to match the new Tailwind classes -->
    <script src="js/app.js"></script>
</body>
</html>\`;

    fs.writeFileSync('index.html', finalHtml);
    console.log('Build completed!');
}

buildIndex();
