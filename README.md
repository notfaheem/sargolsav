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

## 🚀 Features Delivered (Phases 1 through 6 - Complete)

### 🏫 1. Madrasa-to-Unit Mapping System (Manual Rule 19 Compliant)
- **Automatic Default Unit Derivation:** Automatically normalizes source madrasa names into clean uppercase Unit short-names during CSV / copy-paste import (ignoring raw or blank CSV unit columns).
- **Multiple Madrasas under Shared Units:** Directly complies with Sargolsav Manual Page 3 Rule 19: when a Unit has 2 Madrasas under it, both Madrasas compete separately and combine their points into one single Unit on the Championship leaderboards.
- **Rule 19 Group Item Deduplication:** Group item deduplication key updated to `(item_code, madrasa || unit)`, allowing two separate Madrasas under the same Unit to both contribute their Group performance points while preventing duplicate student rows within the same Madrasa.
- **Interactive Mapping Console (`/admin` -> Settings Tab & Participants Shortcut):**
  - "Scan Madrasas from Participants" button to detect new institutions.
  - Editable uppercase Unit short-name inputs with `"Shared Unit (X Madrasas)"` badges.
  - One-click `"Save & Sync Units to All Participants"` syncing changes across `madrasa_unit_map` and the `participants` directory.

### 📈 2. Live & Total Traffic Analytics (Phase 6)
- **🟢 Live Viewers Right Now:** Connected to Supabase Presence channel (`'online-visitors'`). Syncs real-time count of active public website visitors with a live pulsing indicator.
- **👁️ Total Website Views:** Session-deduplicated pageview counter storing cumulative views in `settings.total_views`, complete with `"🔄 Refresh"` and `"Reset Counter"` controls in Admin Settings.

### 📁 2. Festival Resources Manager & Public Viewer (Phase 6)
- **Admin Document Manager (`/admin` -> Resources Tab):**
  - **Direct File Upload:** Upload PDF manuals, stage schedules, or venue maps directly to Supabase Storage (`resources` bucket).
  - **External Link Fallback:** Paste direct Google Drive or web URLs.
  - Delete controls with instant logging to the System Diagnostics Console.
- **Public Document Viewer (`/` -> Resources Tab):**
  - Clean card directory with document icons and type badges (`PDF DOCUMENT` / `IMAGE / MAP`).
  - **"👁️ Preview Inline" Modal:** In-app iframe/image viewer to read documents without leaving the portal.
  - **"📥 Download / Open" Button:** One-click download or open in new tab.

### 🛡️ 3. Guaranteed Supabase Fallback Credentials (Phase 6)
- Hardcoded fallback credentials inside `src/lib/supabase.js` ensuring the portal will never throw `Invalid supabaseUrl` on Vercel even if environment variables are unset.

### 📱 4. Mobile UX: Unpinned Main Branding Header (Phase 6)
- Released `sticky` constraint on the large festival banner so it scrolls away naturally, maximizing screen area for result tables and podiums while keeping only the compact 3-tab navigation bar accessible.

### 🏆 5. Live Championships, Podiums & Kalaprathibha Engine (Phase 5)
- **Interactive 3-Step Olympic Podium (`<Podium />`):**
  - Real 3-step podium with Gold (Center, tallest, Crown & Trophy), Silver (Left, Medal), and Bronze (Right, Medal) steps.
  - Full support for ties on any step without layout breaking.
- **Strict Fest Tabulation Rules Applied:**
  - **Group Deduplication:** For `mode === 'GROUP'`, units are awarded the highest score achieved by their group entry once (`Math.max`), preventing duplicate points when multiple members are enrolled.
  - **Single Items:** Point values sum normally for the unit.
- **Three Specialized Views:**
  1. **🏆 Overall Unit Championship:** Live points table across all published items. Clicking on any unit row opens the **Unit Scorecard Modal** listing every student, rank, and point contribution.
  2. **📂 Category-wise Unit Championship:** Filter standings and podiums specifically for `KIDS`, `CHILDREN`, `SUB JUNIOR`, `JUNIOR`, and `TEENS`.
  3. **🌟 Individual Champions (Manual Page 4):**
     - **Single Items Exclusively:** Only Single items count toward the primary individual score.
     - **Official Qualification Criteria:** Participant must hold $\ge 1$ First Rank in a Single item **AND** accumulate $>15$ Single Points ($\ge 16$ pts).
     - **Group Tie-Breaker:** When single scores tie, published Group item points (Rank 1/2/3 = 3/2/1 pts, Grade A/B/C = 3/2/1 pts) break the tie. If still equal, Joint Champions are declared.
     - **Early Festival Contenders Strip:** Displays live top contenders with a visual progress bar toward 16 points (e.g. `10/16 pts - Needs 6 more pts & 1st rank`).

### 📄 2. Official 2024-Style Result PDF Generator (Phase 5)
- **High-DPI 800px Off-screen Render:** Uses `html2canvas` + `jspdf` to render dedicated DOM templates into A4 PDFs (`Sargolsav_2026_Item_${code}_Result.pdf`).
- **100% Malayalam Typography Fidelity:** Avoids font breaking in standard jsPDF by rendering Noto Sans Malayalam at 2x DPI.
- **Identical to Official 2024 Nilambur Mandalam Result Sheet:** Includes official header, logo, item code, category, mode, clean bordered table (`SL NO`, `Reg NO`, `Name`, `Unit`, `GRADE`, `RANK`), and committee certification footer.
- **One-Click Download:** Available in both Public Result Sheet modal and Admin Score Sheet management bar.

### 🌐 3. Vercel SPA Direct Routing (`vercel.json`) (Phase 5)
- Catch-all rewrites rule to route all direct URL visits (`/admin`, `/championships`) directly to `index.html` preventing 404 errors on Vercel deployments.

### 🔍 4. Public Item Result View & Tied-Winner Cards (Phase 4)
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
