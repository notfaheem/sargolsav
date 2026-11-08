# MSM-CIER Sargolsav 2026 - Nilambur Sub-District
### Festival Result & Tabulation Management Portal
**Host Venue:** Amal College of Advanced Studies, Myladi, Nilambur  
**Organized by:** MSM-CIER Kerala | Markazudawa

---

## 📌 Overview

**Sargolsav 2026 Result & Tabulation Portal** is an ultra-lightweight, mobile-first web application engineered specifically for low-latency score tabulation, item browsing, and real-time result publication during the Nilambur Sub-District Sargolsav festival at Amal College, Myladi.

Designed to operate seamlessly on congested venue mobile networks, this portal features:
- A high-speed **Public Item & Result Browser** for participants, units, and parents.
- A secured **Stealth Committee Admin Portal** (`/admin`) for festival officials to adjust festival announcements, scoring rules, and tabulation settings in real-time.

---

## 🚀 Phase 1 Features Delivered

### 1. Public Portal (`/`)
- **Emergency / Broadcast Announcement Bar:** Dynamic banner with megaphone icon controlled via committee settings.
- **Festival Branding Header:** Clean festival title, Kerala MSM-CIER & Markazudawa badge, and Nilambur sub-district location subtitle.
- **3-Tab Navigation:**
  - **Results (Active):** Category and item browser.
  - **Championships (Phase 5 Placeholder):** Unit standings and category trophies.
  - **Resources (Phase 6 Placeholder):** Festival handbook, rulebook, and mark sheet downloads.
- **Category Filter Pills:** Instant 1-click filtering across all 5 official categories:
  - `KIDS` (Coral Orange)
  - `CHILDREN` (Emerald Green)
  - `SUB JUNIOR` (Royal Blue)
  - `JUNIOR` (Purple)
  - `TEENS` (Teal)
- **Item Cards Grid:**
  - Item code badge (e.g. `#101`)
  - Malayalam name in bold typography (`Noto Sans Malayalam`)
  - English name in subtitle typography (`Plus Jakarta Sans`)
  - Mode badge (`SINGLE` / `GROUP`)
  - Live status indicator: `Result Published` (green) or `Awaiting Result` (slate).
- **Global Search Ready:** Interactive search bar prepared for Phase 4 participant queries with live client-side item filtering.
- **Privacy Enforcement:** Public queries strictly omit judge scores, percentages, and admin credentials.

### 2. Stealth Admin Portal (`/admin`)
- **Stealth Route:** No administrative or login links visible anywhere on public pages.
- **PIN Gate:** Protected by 4-digit committee security PIN (Default: `2026`) verified against Supabase `settings` table with local session caching in `sessionStorage`.
- **Top Admin Header:** Includes quick **"View Live Site ↗"** shortcut and **"Lock / Logout"** session terminator.
- **4 Admin Navigation Tabs:**
  - **Settings (Phase 1 Complete):**
    - Announcement text editor.
    - Show / Hide announcement banner toggle.
    - Enforce Minimum 2 Entries Rule (Page 2, Rule 12) toggle with explanatory guidance.
    - Admin PIN updater.
    - Button locking with loading spinner to prevent double submissions.
    - Green toast feedback notifications on save.
  - **Score Sheet (Tabulation) (Phase 3 Placeholder)**
  - **Participants (Bulk Import) (Phase 2 Placeholder)**
  - **Resources (Phase 6 Placeholder)**

---

## 🛠️ Tech Stack

- **Frontend:** React 19 + Vite 8
- **Styling:** Tailwind CSS 3.4
- **Icons:** Lucide React
- **Routing:** React Router v7
- **Database / Backend:** Supabase (`@supabase/supabase-js`)
- **Typography:** Google Fonts (`Plus Jakarta Sans` & `Noto Sans Malayalam`)

---

## 📦 Database Schema (Pre-Configured Tables)

1. `settings`: `id`, `announcement_text`, `show_announcement`, `enforce_min_entry_rule`, `admin_pin`
2. `items`: `code`, `name_ml`, `name_en`, `category`, `mode`, `is_published`, `published_at`
3. `participants`: `reg_no`, `name`, `category`, `district`, `zone`, `unit`, `madrasa`
4. `participations`: `id`, `item_code`, `reg_no`, `chest_no`, `judge1`, `judge2`, `judge3`, `total_score`, `percentage`, `grade`, `rank`, `points`
5. `resources`: `id`, `title`, `file_url`, `file_type`, `created_at`

---

## ⚙️ Environment Variables

Create `.env` or `.env.local` in the project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://vmxszvgtyyboyeojjsnk.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_u8bIDf8RceSX6m5UMg6sIA_Y39v7sqt

# Next.js Fallback Compatibility
NEXT_PUBLIC_SUPABASE_URL=https://vmxszvgtyyboyeojjsnk.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_u8bIDf8RceSX6m5UMg6sIA_Y39v7sqt
```

*(Note: Safe fallback credentials are also bundled in `src/lib/supabase.js` so the application connects out of the box).*

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
- **Admin Portal:** [http://localhost:5173/admin](http://localhost:5173/admin) (Default PIN: `2026`)

### 4. Build for production
```bash
npm run build
```

---

## 📋 Security & Architecture Notes
- **Zero Double-Click State:** Category pill filters and settings updates avoid stale closures by passing values directly to async workers.
- **Button Locking:** Every mutation locks the trigger button in an `isSubmitting` state with an animated spinner until the database write finishes.
- **Public Data Privacy:** Public views never request sensitive scoring fields (`judge1`, `judge2`, `judge3`, `total_score`, `percentage`, `admin_pin`).
