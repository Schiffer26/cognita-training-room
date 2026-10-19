# COGNĪTA

Computer Training Room Feedback Collection and Management System.

## Quick Start (VS Code)

### Prerequisites
- Node.js 18+ (download from https://nodejs.org)
- PostgreSQL 15+ (download from https://www.postgresql.org/download/)

### Step 1: Open in VS Code
1. Open VS Code.
2. File → Open Folder → select this project folder.

### Step 2: Install Dependencies
Open the VS Code terminal (Ctrl + `) and run:
```bash
npm install
```

### Step 3: Configure Database
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and set your PostgreSQL connection string.
3. Set `JWT_SECRET` to a long random string.

### Step 4: Initialize Database
```bash
npx drizzle-kit push
```
This creates all the required database tables.

### Step 5: Start Development Server
```bash
npm run dev
```
Open http://localhost:3000 in your browser.

### Step 6: Create Administrator Account
1. Visit http://localhost:3000/setup
2. Enter a username, display name, and password (min. 8 characters).
3. This can only be done once. After the first admin is created, the setup page is disabled.

### Step 7: Using the Application
- **Welcome Page**: http://localhost:3000 — Users start the survey from here.
- **Survey**: Complete and submit feedback through the multi-step form.
- **Admin Login**: Click the helmet icon in the top-right corner of the welcome page.
- **Admin Dashboard**: View, search, filter, export, and delete feedback records.

## Database Backup

### Create a Backup
```bash
pg_dump -U postgres -h 127.0.0.1 -d app_db > backup_$(date +%Y%m%d).sql
```

### Restore a Backup
```bash
psql -U postgres -h 127.0.0.1 -d app_db < backup_20250101.sql
```

### Verify Backup
After restoring, log in to the admin dashboard and check that records are present.

## Replacing Images
See `ASSET_GUIDE.md` for instructions on replacing placeholder logos and images.

## Architecture
- **Framework**: Next.js 16 with TypeScript (App Router)
- **Database**: PostgreSQL via Drizzle ORM
- **Authentication**: JWT sessions with bcrypt password hashing
- **Exports**: docx (Word), jsPDF (PDF), CSV
- **Styling**: Tailwind CSS 4

## Deployment Notes
- Do not expose PostgreSQL directly to the internet.
- All database access goes through the Next.js API routes.
- Use HTTPS in production.
- Free hosting options include Railway (limited free tier), Render (limited), or self-hosted on a local server.
- No free hosting service guarantees permanent availability for organizational use.

## Windows Launcher (Future)
The web application is ready. A Windows launcher application is needed to:
1. Launch the survey at startup.
2. Prevent desktop access until the survey is complete.
3. Release the desktop after successful submission.

This requires a separate Windows application and Group Policy configuration.
See the inline documentation for integration points.
