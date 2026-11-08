# MSM-CIER Sargolsav 2026 - Nilambur Sub-District
### Festival Result & Tabulation Management Portal
**Host Venue:** Amal College of Advanced Studies, Myladi, Nilambur  
**Organized by:** MSM-CIER Kerala | Markazudawa

---

## 📌 Overview

**Sargolsav 2026 Result & Tabulation Portal** is an ultra-lightweight, mobile-first web application engineered specifically for low-latency score tabulation, item browsing, and real-time result publication during the Nilambur Sub-District Sargolsav festival at Amal College, Myladi.

Designed to operate seamlessly on congested venue mobile networks, this portal features:
- A high-speed **Public Item & Result Browser** for participants, units, and parents.
- A secured **Stealth Committee Admin Portal** (`/admin`) for festival officials to tabulate scores, verify results with appeal overrides, publish live, and manage contenders.

---

## 🚀 Features Delivered (Phase 1, Phase 2, Phase 3 & Phase 4)

### 🏆 1. Public Item Result View & Tied-Winner Cards (Phase 4)
- **Strict Public Data Privacy:** Public views strictly omit `judge1`, `judge2`, `judge3`, `total_score`, `percentage`, and `chest_no`. Only verified Rank, Grade, Points, Name, Reg No, and Unit are displayed.
- **Published Item Modal:**
  - Header showing Item Code badge, Category badge, Mode badge (`SINGLE`/`GROUP`), bold Malayalam name, and English name.
  - **Top Winners Highlight Cards (Section A):**
    - **1st Place:** Gold card (`bg-amber-50 border-amber-300 text-amber-900`) with Trophy icon and "FIRST PLACE" banner.
    - **2nd Place:** Silver card (`bg-slate-50 border-slate-300 text-slate-800`) with Medal icon and "SECOND PLACE" banner.
    - **3rd Place:** Bronze card (`bg-orange-50 border-orange-300 text-orange-900`) with Medal icon and "THIRD PLACE" banner.
    - **Graceful Tie & Missing Rank Support:** Multiple tied winners automatically render in the grid without layout shifts. Items with only 1st place cleanly render without empty placeholder boxes.
    - Each winner card displays participant name, unit name, reg no, grade badge (`Grade A/B/C`), and earned points (`+10 pts`).
  - **Official Consolidated Result Table (Section B):**
    - Displays all ranked and graded contenders (`grade IS NOT NULL OR rank IS NOT NULL`), sorted by rank (1, 2, 3), then unranked graded (A, B, C), then reg no.
    - Columns: `SL NO`, `REG NO`, `NAME`, `UNIT`, `GRADE`, `RANK`, and `POINTS`.
  - **Share & Print Result:**
    - Clean printer stylesheet (`window.print()`) formatted for official printouts and PDF generation.
    - Native mobile share / WhatsApp summary copy link.
- **Friendly Awaiting Notice:** If a user clicks an item where `is_published === false`, a clean status notice informs: *"Result not announced yet. Tabulation in progress!"*.

### 🔍 2. Instant Global Search (Student & Unit Lookup) (Phase 4)
- Top global search bar wired for instant queries without page reloads.
- **Student / Reg No Search:**
  - Search by Registration No (e.g. `10252`) or Participant Name (e.g. `DIYA FATHIMA`).
  - Displays **Student Profile Card** with Reg No, Name, Category, Unit, Madrasa, and **Total Individual Points Earned So Far**.
  - Lists all registered items with published results (Rank, Grade, Points) or an `"Awaiting Result"` badge.
  - 1-click chip navigation to open any published item's full result sheet.
- **Unit Search:**
  - Search by Unit name (e.g. `AKAMBADAM`, `MYLADI`).
  - Displays **Unit Summary Card** with Total Unit Points, Awardee count, and registered contenders.
- **1-Click "✕ Clear Search":** Instantly returns to the category browsing grid.

### 🔥 3. Recently Published Results Ticker Strip (Phase 4)
- Renders a horizontal scrollable strip of recently published items ordered by publication timestamp.
- Allows festival attendees to open the latest published results on the first click.

### 📊 4. Digital Consolidated Score Sheet & Tabulation Engine (Phase 3)
- Official PDF-equivalent tabulation sheet with category & item selectors, publish status filters, and late entry additions.
- Dense ranking engine for ties (1st = +5 pts, 2nd = +3 pts, 3rd = +1 pt, Grade A = 5 pts, Grade B = 3 pts, Grade C = 1 pt).
- Single entry rule (Page 2, Rule 12) checking.
- Save draft scores, result verification preview modal with appeal/judge manual override controls, and 1-click live publish/unpublish.

### 🗑️ 5. "Delete All Participants" Safe Reset (Phase 3)
- Two-step confirmation modal requiring typing `DELETE` to clear test data and reset items to unpublished.

### 🎨 6. Official Festival Logo & Identity (Phase 2)
- Official Sargothsav 2026 artwork in public header, admin header white pill container, and browser favicon.

### 🧑‍💼 7. Bulk Participant Importer & Directory (Phase 2)
- Official MSM CSV & table paste importer with score-safe re-imports, single participant modal, and filtered directory.

### 🖥️ 8. Admin Diagnostics & Activity Console (Phase 2)
- Real-time audit trail, database latency ping test, and log clipboard utilities.

---

## 🛠️ Tech Stack

- **Frontend:** React 19 + Vite 8
- **Styling:** Tailwind CSS 3.4
- **Icons:** Lucide React
- **Routing:** React Router v7
- **Database / Backend:** Supabase (`@supabase/supabase-js`)
- **Typography:** Google Fonts (`Plus Jakarta Sans` & `Noto Sans Malayalam`)

---

## 💻 Local Development Setup

### 1. Clone repository
```bash
git clone https://github.com/notfaheem/sargolsav.git
cd sargolsav
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start local development server
```bash
npm run dev
```

Open your browser at:
- **Public Results Portal:** [http://localhost:5173/](http://localhost:5173/)
- **Admin Portal:** [http://localhost:5173/admin](http://localhost:5173/admin) *(Default PIN: `2026`)*

### 4. Build for production
```bash
npm run build
```
