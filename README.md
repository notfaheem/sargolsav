# MSM-CIER Sargolsav 2026 - Nilambur Sub-District
### Festival Result & Tabulation Management Portal
**Host Venue:** Amal College of Advanced Studies, Myladi, Nilambur  
**Organized by:** MSM-CIER Kerala | Markazudawa

---

## 📌 Overview

**Sargolsav 2026 Result & Tabulation Portal** is an ultra-lightweight, mobile-first web application engineered specifically for low-latency score tabulation, item browsing, and real-time result publication during the Nilambur Sub-District Sargolsav festival at Amal College, Myladi.

Designed to operate seamlessly on congested venue mobile networks, this portal features:
- A high-speed **Public Item & Result Browser** for participants, units, and parents.
- A secured **Stealth Committee Admin Portal** (`/admin`) for festival officials to adjust festival announcements, scoring rules, import contenders, and inspect live diagnostics.

---

## 🚀 Features Delivered (Phase 1 & Phase 2)

### 🎨 1. Official Festival Logo & Identity (Phase 2)
- High-resolution official **Sargothsav 2026 artwork** integrated into `public/logo.png` and configured as the browser favicon.
- **Public Header (`/`):** Features the official festival logo alongside the festival title and MSM-CIER badges.
- **Admin Header (`/admin`):** Logo is encased in a clean white rounded pill container (`bg-white p-1 rounded-xl shadow-xs`) on top of the deep navy `#1B254B` header to ensure artwork colours pop vibrantly.
- **Admin PIN Gate:** Unlocking screen showcases the official festival logo.

### 🧑‍💼 2. Bulk Participant Importer & Directory (Phase 2)
- **Official MSM CSV & Table Paste Importer (Mode A):**
  - **CSV File Upload:** Drag-and-drop or select official CSV files exported from the MSM portal.
  - **Raw Text / Clipboard Paste:** Directly paste copied table rows (supports tab-separated values from website tables and comma-separated rows).
  - **Flexible Parsing Engine:** Extracts `reg_no`, `name`, `category` (normalized to `KIDS`, `CHILDREN`, `SUB JUNIOR`, `JUNIOR`, `TEENS`), `district`, `zone`, `unit`, `madrasa`, and parses comma-separated lists of `Single` and `Group` item codes.
  - **Pre-Import Data Validation:** Displays detected counts, flags unmapped or missing item codes, and renders a live preview table.
  - **Score-Safe Upserts:** Executes bulk upsert into `participants` table (`onConflict: 'reg_no'`) and `participations` table (`onConflict: 'item_code,reg_no', ignoreDuplicates: true`), guaranteeing existing judge scores are **never overwritten** upon re-import.
- **Single Participant Add / Edit Modal (Mode B):**
  - Instant manual registration or update of `reg_no`, `name`, `category`, `unit`, `madrasa`.
  - Dynamic multi-select checkboxes displaying items belonging to the selected category.
- **Searchable Participant Directory:**
  - Real-time summary stat cards: **Total Participants**, **Total Units**, and **Total Item Enrollments**.
  - Multi-parameter search bar (`reg_no`, `name`, or `unit`).
  - Filtering by **Category** and **Unit**.
  - Interactive table showing registration badges, unit, enrolled item badges, and **Edit** / **Delete** controls (with confirmation safety dialogs).

### 🖥️ 3. Admin Diagnostics & Activity Console (Phase 2)
- **Live Terminal-Style Console:** Embedded inside `/admin -> Settings` tab.
- **Supabase DB Ping & Latency Tester:** Real-time roundtrip latency check in milliseconds (e.g. `Connected - 78ms`) querying `settings` and `items` count.
- **Client-Side Audit Trail:** Records operations into `sessionStorage` (up to 50 logs) with color-coded status badges (`SUCCESS` green, `WARNING` yellow, `ERROR` red), action tags, timestamps, and messages.
- **Console Utilities:** One-click **"Copy Logs"** to clipboard and **"Clear Console"** buttons.

### 🌐 4. Public Portal (`/`) (Phase 1)
- **Broadcast Announcement Bar:** Dynamic banner with megaphone icon controlled via committee settings.
- **Category Filter Pills:** Instant 1-click filtering across `KIDS` (`#F26430`), `CHILDREN` (`#16A34A`), `SUB JUNIOR` (`#2563EB`), `JUNIOR` (`#7C3AED`), and `TEENS` (`#0D9488`).
- **Item Cards Grid:** Malayalam name (`Noto Sans Malayalam`), English name (`Plus Jakarta Sans`), item code badge, mode tag (`SINGLE`/`GROUP`), and live status (`Result Published` / `Awaiting Result`).
- **Data Privacy:** Public queries strictly omit judge scores, percentages, and admin credentials.

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

---

## 📋 Security & Anti-Bug Architecture
- **Zero Double-Click Bugs:** Category pill filters and save mutations pass target values directly into handlers without relying on stale React closures.
- **Button Locking:** Every mutation locks the trigger button in an `isSubmitting` state with an animated spinner until the database write finishes.
- **Safe Re-Imports:** Bulk enrollments utilize `onConflict: 'item_code,reg_no', ignoreDuplicates: true` ensuring existing scores/grades are preserved.
- **Public Data Privacy:** Public views never request sensitive scoring fields (`judge1`, `judge2`, `judge3`, `total_score`, `percentage`, `admin_pin`).
