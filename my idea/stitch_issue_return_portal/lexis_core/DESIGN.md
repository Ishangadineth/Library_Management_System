# Design System: The Academic Curator

## 1. Overview & Creative North Star
**Creative North Star: "The Modern Archivist"**
This design system rejects the "spreadsheet" aesthetic common in administrative tools. Instead, it adopts a high-end editorial approach, treating library data with the same reverence as a rare manuscript. We move beyond the "template" look by using **intentional asymmetry**, **tonal depth**, and **exaggerated white space**. The interface should feel less like a database and more like a curated digital gallery—sophisticated, authoritative, and frictionless.

## 2. Colors & Tonal Architecture
The palette is rooted in `primary` (#001e40), a deep, intellectual blue that commands trust. However, the "premium" feel is achieved through the nuanced application of neutral surfaces.

### The "No-Line" Rule
Standard 1px borders are strictly prohibited for sectioning. Boundaries must be defined through background shifts. 
*   **Example:** A side navigation pane should use `surface_container_low` (#f4f3f8) against a main content area of `surface` (#f9f9fe). 

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, fine papers. 
*   **Level 0 (Base):** `surface` (#f9f9fe)
*   **Level 1 (Sectioning):** `surface_container_low` (#f4f3f8) for secondary panels.
*   **Level 2 (Active Cards):** `surface_container_lowest` (#ffffff) to provide a subtle "lift" for book details or member profiles.
*   **Level 3 (High Focus):** `surface_container_high` (#e8e8ed) for utility bars or search headers.

### The Glass & Gradient Rule
To prevent the deep blues from feeling heavy, apply **Glassmorphism** to floating elements (like quick-view book modals). Use `surface_container_lowest` at 80% opacity with a 12px backdrop-blur. Main CTAs should utilize a subtle linear gradient from `primary` (#001e40) to `primary_container` (#003366) to add "soul" and dimension.

## 3. Typography: The Editorial Scale
We pair the technical precision of **Inter** for data with the sophisticated, wide character set of **Manrope** for display logic.

*   **Display & Headlines (Manrope):** Use `display-md` for library stats and `headline-sm` for section headers. The wider tracking and geometric forms of Manrope convey a modern, architectural feel.
*   **The "Readable List" (Inter):** For book titles and member lists, use `title-sm` (1rem). It provides enough weight to be legible in long vertical scans without the "clutter" of bold tags.
*   **Data Labels (Inter):** Use `label-md` in `on_surface_variant` (#43474f) for metadata (ISBN, Due Date) to create a clear hierarchy against the primary text.

## 4. Elevation & Depth
Hierarchy is achieved through **Tonal Layering**, not structural lines.

*   **The Layering Principle:** Place a `surface_container_lowest` card atop a `surface_container_low` background. This creates a natural, soft-edge separation that feels premium and "airy."
*   **Ambient Shadows:** For floating elements like dropdowns or popovers, use a shadow with a 24px blur at 6% opacity, using the `on_surface` color as the shadow base. This mimics natural light rather than digital "glow."
*   **The "Ghost Border" Fallback:** If a border is required for accessibility in high-density tables, use the `outline_variant` token (#c3c6d1) at **15% opacity**. It should be felt, not seen.

## 5. Components & Interaction Patterns

### Data Tables (The "Curated List")
*   **No Dividers:** Forbid the use of horizontal rules between rows. Instead, use a `2.5` (0.625rem) vertical padding and a subtle `surface_container_low` hover state to highlight the active row.
*   **Asymmetric Headers:** Align table headers to the `label-md` scale, all-caps, with `0.05em` letter spacing for a professional, "ledger" feel.

### Action Buttons
*   **Primary:** Gradient fill (`primary` to `primary_container`), `xl` (0.75rem) corner radius. No border.
*   **Secondary:** `surface_container_high` background with `on_primary_fixed_variant` text.
*   **Tertiary:** Transparent background with `primary` text. Use only for low-emphasis actions like "Cancel" or "Back."

### Input Fields
*   **Style:** Use the `surface_container_highest` background with a `none` border. On focus, transition to a `px` "Ghost Border" using the `surface_tint` (#3a5f94) to signal activity without jarring the layout.

### Book Status Chips
*   **Available:** `secondary_container` (#cbe7f5) background with `on_secondary_container` text.
*   **Overdue:** `error_container` (#ffdad6) background with `on_error_container` text.
*   **Shape:** Always use `full` (9999px) roundedness for chips to contrast against the `xl` radius of cards.

## 6. Do’s and Don’ts

### Do:
*   **Do** use the `24` (6rem) spacing token for "breathing room" between major dashboard sections.
*   **Do** use `title-lg` for book titles in detail views to emphasize the "Editorial" feel.
*   **Do** leverage `surface_bright` for active states in navigation menus to create a subtle glow.

### Don’t:
*   **Don’t** use a 100% opaque `outline` for any element; it breaks the "Modern Archivist" softness.
*   **Don’t** use standard "Blue" links. Use `primary` text with a `surface_tint` underline (2px thickness) for a custom feel.
*   **Don’t** crowd the data. If a table has more than 8 columns, move secondary data into a "Quick View" glassmorphic side panel.