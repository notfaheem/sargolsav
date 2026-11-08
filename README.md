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

## 🚀 Features Delivered (Phase 1, Phase 2 & Phase 3)

### 📊 1. Digital Consolidated Score Sheet & Tabulation Engine (Phase 3)
- **Official PDF-Equivalent Digital Score Sheet:**
  - Category selector (`KIDS`, `CHILDREN`, `SUB JUNIOR`, `JUNIOR`, `TEENS`) and item selector with live `Published` / `Pending` status indicators.
  - Official header banner matching festival tabulation sheets: **Item Code**, **Item Names (Malayalam & English)**, **Category**, **Mode**, and **Total Entries**.
  - Keyboard-friendly data entry table with columns for `Sl No`, `Chest No`, `Reg No`, `Participant & Unit`, `Judge 1` (0-100), `Judge 2` (0-100), `Judge 3` (0-100), `Total` (out of 300), `%`, `Grade`, `Rank`, and `Points`.
  - **Late Entry Integration:** Quick `+ Add Late Entry` button to enroll participants by `reg_no` directly from the scoresheet.
- **Official Sargolsav 2026 Calculation Math Engine:**
  - **Absentee Handling:** If all 3 judges are blank or 0 $\rightarrow$ marked absent, null scores, 0 points.
  - **Percentage & Grades (out of 300):**
    - `percentage = (total_score / 300) * 100`
    - Grade A: $\ge 75\%$ (Total $\ge 225$) $\rightarrow$ **5 Grade Points**
    - Grade B: $\ge 60\%$ and $< 75\%$ (Total $180 - 224.99$) $\rightarrow$ **3 Grade Points**
    - Grade C: $\ge 50\%$ and $< 60\%$ (Total $150 - 179.99$) $\rightarrow$ **1 Grade Point**
    - Below $50\%$: No Grade $\rightarrow$ **0 Grade Points**
  - **Dense Ranking for Ties:**
    - Distinct 1st score $\rightarrow$ **Rank 1 (+5 Rank Points)** (shared ties both receive Rank 1).
    - Distinct 2nd score $\rightarrow$ **Rank 2 (+3 Rank Points)**.
    - Distinct 3rd score $\rightarrow$ **Rank 3 (+1 Rank Point)**.
  - **Total Points:** `Points = Grade Points + Rank Points` (e.g. 1st + A = 10 pts, 2nd + A = 8 pts, A with no rank = 5 pts).
  - **Page 2, Rule 12 Enforcement:** If `enforce_min_entry_rule` is enabled and fewer than 2 participants compete, awards Grade only with 0 total points.
- **Draft Saving & Live Publishing Flow:**
  - **"💾 Save Draft Scores":** Commits scores to `participations` without making results public.
  - **"👁️ Preview & Publish Result" Modal:** Spotlight preview of Rank 1, 2, and 3 winners.
  - **Appeal / Manual Override Controls:** Allows officials to manually adjust Grade, Rank, or Points in case of official appeal decisions or judge tie-breaks.
  - **"🚀 Confirm & Publish Live":** Atomically saves scores and updates `items.is_published = true`.
  - **"Unpublish Result":** Allows retracting live results back to draft if adjustments are required.

### 🗑️ 2. "Delete All Participants" Safe Reset (Phase 3)
- Located in the **Participants (Bulk Import)** tab header.
- Guarded by a strict two-step confirmation modal requiring typing **DELETE**.
- Cleans `participations` and `participants` tables, resets all 71 items to `is_published = false, published_at = null`, logs `[CLEAR_ALL_DATA]` to the diagnostics console, and refreshes directory counters.

### 🎨 3. Official Festival Logo & Identity (Phase 2)
- High-resolution official **Sargothsav 2026 artwork** integrated into `public/logo.png` and configured as the browser favicon.
- **Public Header (`/`):** Features the official festival logo alongside the festival title and MSM-CIER badges.
- **Admin Header (`/admin`):** Logo is encased in a clean white rounded pill container (`bg-white p-1 rounded-xl shadow-xs`) on top of the deep navy `#1B254B` header to ensure artwork colours pop vibrantly.
- **Admin PIN Gate:** Unlocking screen showcases the official festival logo.

### 🧑‍💼 4. Bulk Participant Importer & Directory (Phase 2)
- Official MSM CSV & clipboard table paste importer supporting single/group item extraction.
- Single participant add/edit modal with category item selectors.
- Searchable participant directory with filters by category and unit.

### 🖥️ 5. Admin Diagnostics & Activity Console (Phase 2)
- Live terminal audit trail in `/admin -> Settings` tab.
- Supabase DB ping and latency measurement in milliseconds.
- Copy logs to clipboard and clear console utilities.

### 🌐 6. Public Portal (`/`) (Phase 1)
- Broadcast announcement banner, 5 category filter pills, item cards grid, and public privacy protections.

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
