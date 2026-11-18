# LumiDash

A club activity and management dashboard for **Lumina Club** (Chulalongkorn University).  
**Problem Chosen:** P4 – Club Activity Dashboard *(Computer Engineering Essential, Semester 1/2026 Final Project)*

---

## Features

- **Authentication & Protected Routes:** Sign up, log in, and log out powered by **Supabase Auth**, securing all dashboard routes.
- **Dashboard Overview & Analytics:**
  - **3 Summary Stat Cards:** Total Active Members, Total Events Conducted, and Total Budget Used.
  - **2 Interactive Visualizations:** Attendance count per event and Planned vs. Used budget comparison across categories.
- **Google Sheets & Supabase Data Sync:** Automatically fetches club records from Google Sheets (`Members`, `Events`, `Budget`, `Attendance`) and syncs changes with the Supabase PostgreSQL database.
- **Member & Event Management:** Create, update, delete, and record event attendance directly within the web application.
- **Smart In-App Notifications & Reminders:** Real-time toast alerts and notification badge triggered when:
  - Total budget usage exceeds **80%** of the planned budget.
  - An upcoming club event is scheduled within the next **3 days**.
- **Dark Mode / Light Mode:** Seamless theme toggle persisted in `localStorage`.
- **Responsive UI:** Adaptive layout optimized for both desktop and mobile screens.

---

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Authentication & Database:** Supabase (`@supabase/supabase-js`)
- **External Data API:** Google Sheets JSON Feed (`opensheet.elk.sh`)
- **Deployment:** Vercel

---

## Prerequisites

Before setting up the project, ensure you have the following:

1. **Node.js** (v18.0 or higher) and **npm** installed on your machine.
2. A **Supabase** account and project ([supabase.com](https://supabase.com)).
3. A published **Google Sheet** containing four tabs: `Members`, `Events`, `Budget`, and `Attendance`.

---

## Setup & Installation

### 1. Clone the Repository

```bash
git clone <your-github-repository-url>
cd LumiDash-main
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables (`.env`)

Create a `.env` file in the root directory of the project and add your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> **Security Warning — Do Not Commit API Keys:**  
> Never commit your `.env` file or expose real API keys in the GitHub repository. Ensure `.env` and `*.local` remain listed in `.gitignore`. When deploying to platforms like **Vercel**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` directly in **Project Settings → Environment Variables**.

### 4. Set Up the Supabase Database

Run the SQL migration scripts inside `supabase/migrations/` using the **Supabase SQL Editor** in chronological order to create the required tables (`members`, `events`, `attendance`) and Row Level Security (RLS) policies.

### 5. Connect Your Google Sheet (Optional)

If you are using your own Google Sheet mock data:
1. Ensure your sheet has 4 tabs: `Members`, `Events`, `Budget`, and `Attendance`.
2. Publish the sheet to the web (`File → Share → Publish to web`).
3. Update `SHEET_ID` in `src/lib/sheet.ts` with your Google Sheet ID.

---

## Running the Project

### Start the Development Server

```bash
npm run dev
```

Once started, open your browser and navigate to `http://localhost:5173`.

### Other Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the local Vite development server |
| `npm run build` | Builds the application for production into `dist/` |
| `npm run preview` | Previews the production build locally |
| `npm run typecheck` | Runs TypeScript type checking (`tsc --noEmit`) |
| `npm run lint` | Runs ESLint to check code quality |

---

## Project Structure

```text
LumiDash-main/
├── src/
│   ├── components/         # Reusable UI, layout, modals, and notification components
│   ├── contexts/           # React Contexts (AuthContext, NotificationContext)
│   ├── hooks/              # Custom hooks (useTheme, useLoader, useSheetAttendance)
│   ├── lib/                # API clients, Supabase setup, Google Sheet sync & alert logic
│   ├── pages/              # Main pages (AuthPage, OverviewPage, MembersPage, EventsPage)
│   ├── types/              # TypeScript type definitions
│   ├── App.tsx             # Root component and routing
│   └── main.tsx            # Application entry point
├── supabase/
│   └── migrations/         # SQL schema and migration files
├── .gitignore              # Specifies intentionally untracked files (including .env)
├── package.json            # Project dependencies and npm scripts