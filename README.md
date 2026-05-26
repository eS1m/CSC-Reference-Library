# PRIME-HRM Reference Library

A web application for managing the submission and review of PRIME-HRM (Program to Institutionalize Meritocracy and Excellence in Human Resource Management) assessment documents. Built for the **Civil Service Commission (CSC)** and government agencies under **Region X (Northern Mindanao)**.

---

## Overview

The PRIME-HRM Reference Library streamlines the document workflow between government agencies and CSC reviewers. Agencies complete their profiles, upload Self-Assessment and Action Plan files, and track their progress through a gated workflow. CSC PRIME-HRM Officers and System Administrators review submissions, monitor system activity, and manage recommendations through dedicated dashboards.

---

## User Roles

The application supports three distinct user types:

| Role | Code | Description |
|------|------|-------------|
| **Agency User** | `u` | Government agencies / LGUs who complete agency profiles, manage employee data, upload assessment files, and track submission progress. |
| **CSC RO X** | `p` | CSC reviewers who monitor agencies, manage Field Office Monitoring recommendations, review the compiled Recommendations package, and browse submitted files. |
| **System Administrator** | `admin` | Admins who manage user registrations, approve/reject accounts, view system-wide statistics, monitor active users, and review audit logs. |

---

## Agency Workflow

Agencies progress through a gated multi-step workflow:

1. **Complete Agency Profile** — Agency details, head information, and HRM officer data
2. **Submit Employee Data** — Personnel complement and HRM summary tables
3. **Upload Self-Assessment** — Excel file upload (unlocked only after Steps 1 & 2 are complete)
4. **Upload Action Plan** — Generate from Word template or upload manually (unlocked after Self-Assessment)
5. **Evidence Requirements** — Upload PDF/image evidence (unlocked when selected for Field Office Monitoring)

---

## CSC RO X Workflow

1. **Dashboard** — View all registered agencies, submission stats, and active user count
2. **Field Office Monitoring** (`/fom`) — Select completed agencies, upload Assist Plans and Progress Logs, mark progress, generate OA Recommendations
3. **Recommendations** (`/recom-p`) — Compile the 5-document package per agency (Self-Assessment, Capability Card, Field Director Guidepost, Regional Director Guidepost, Narrative Report)
4. **Drive Browser** — Browse all agency folders and files in Google Drive
5. **Deletion Requests** — Review and approve/reject agency file deletion requests

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 8, React Router DOM 7 |
| Backend | Express.js 5 (Node.js) |
| Authentication | Firebase Auth (Email/Password + Google Sign-In) |
| Database | Firebase Firestore |
| File Storage | Google Drive (via Google Drive API v3) |
| Document Generation | docxtemplater, pizzip, mammoth, exceljs |
| Build Tool | Vite with `@vitejs/plugin-react` |
| Linting | ESLint 9 |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or higher
- [npm](https://www.npmjs.com/)
- A Firebase project with Auth and Firestore enabled
- Google Drive API credentials (for backend file uploads)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd CSC-Reference-Library
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Install backend dependencies:
   ```bash
   cd backend
   npm install
   cd ..
   ```

### Environment Variables

#### Backend
Create a `backend/.env` file using `backend/.env.example` as a template:

```bash
cp backend/.env.example backend/.env
```

Required variables:

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth2 Client ID for Google Drive API |
| `GOOGLE_CLIENT_SECRET` | OAuth2 Client Secret |
| `GOOGLE_REFRESH_TOKEN` | Refresh token for Drive API access |
| `GOOGLE_FOLDER_ID` | Root Google Drive folder ID where agency folders are created |
| `FIREBASE_SERVICE_ACCOUNT` | Base64-encoded Firebase Admin service account JSON |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins |

#### Frontend (Development)
Create a `.env` file at the project root for testing overrides:

```bash
# Shorten idle timeout for testing (values in milliseconds)
VITE_IDLE_WARNING_MS=5000
VITE_IDLE_LOGOUT_MS=5000

# Lower concurrent user limit for testing
VITE_MAX_AGENCY_USERS=2

# Production backend API URL (set before building for deployment)
# VITE_API_URL=https://your-backend-url.com
```

> **Note:** Vite reads `.env` only when the dev server starts. Restart `npm run dev` after changing these values.

### Running Locally

#### Option A: Without Docker

Start the backend server:
```bash
cd backend
npm start
```

In a new terminal, start the frontend development server:
```bash
npm run dev
```

- Frontend: `http://localhost:5173` (Vite dev server)
- Backend: `http://localhost:5000`

#### Option B: With Docker Compose

Build and start all services (frontend, backend, and Nginx reverse proxy):
```bash
docker compose up --build
```

- Main entry point: `http://localhost` (via Nginx)
- Frontend direct: `http://localhost:8080`
- Backend direct: `http://localhost:5000`

To stop:
```bash
docker compose down
```

---

## Deployment

The app is deployed using **Firebase Hosting** (frontend) and **Render** (backend) on free tiers. No credit card is required.

| Layer | Platform | URL |
|-------|----------|-----|
| Frontend | Firebase Hosting | `https://csc-reference-library.web.app` |
| Backend | Render | `https://prime-hrm-backend.onrender.com` |

### Quick Deploy

1. **Build the frontend** with the production backend URL:
   ```bash
   # Windows PowerShell
   $env:VITE_API_URL="https://prime-hrm-backend.onrender.com"
   npm run build
   ```

2. **Deploy to Firebase:**
   ```bash
   firebase deploy --only hosting
   ```

---

## Available Scripts

### Frontend (root directory)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server with HMR |
| `npm run build` | Build production bundle to `dist/` |
| `npm run start` | Preview production build on port 8080 |
| `npm run lint` | Run ESLint |

### Backend (`backend/` directory)

| Command | Description |
|---------|-------------|
| `npm start` | Start Express server |
| `npm run dev` | Start with nodemon (requires global installation) |

### Firebase CLI

| Command | Description |
|---------|-------------|
| `firebase deploy --only hosting` | Deploy frontend to Firebase Hosting |
| `firebase hosting:disable` | Temporarily take the site offline |

---

## Project Structure

```
CSC-Reference-Library/
├── backend/                    # Express.js backend
│   ├── server.js               # Main API server
│   ├── narrativeReport.js      # Narrative Report generator
│   ├── backupService.js        # Firestore backup & restore
│   ├── .env                    # Google API credentials (gitignored)
│   ├── .env.example            # Env var template
│   ├── package.json
│   └── Dockerfile
├── src/
│   ├── App.jsx                 # Root router with role-based routes
│   ├── firebase/               # Firebase config, rules, collections
│   │   ├── config.js           # Firebase init
│   │   ├── firestore.rules     # Security rules
│   │   └── collections/        # Firestore CRUD helpers
│   ├── hooks/                  # Real-time data hooks
│   ├── utils/                  # Shared utilities
│   ├── components/             # Layouts, guards, modals, reusable components
│   │   ├── GenerateModal.jsx   # Document preview modal
│   │   ├── IdleTimeoutModal.jsx # Session timeout handler
│   │   ├── SessionTracker.jsx  # Active session heartbeat tracker
│   │   └── Modal.jsx           # Shared modal system
│   ├── pages/                  # Role-based page components
│   │   ├── lgu/                # Agency user pages
│   │   ├── prime/              # CSC RO X pages
│   │   └── admin/              # Admin pages
│   └── css/                    # Component and page styles
├── .firebaserc                 # Firebase CLI project alias
├── firebase.json               # Firebase Hosting config
├── render.yaml                 # Render deployment blueprint
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
├── .env.example                # Frontend dev overrides
├── package.json
└── vite.config.js
```

---

## Firestore Collections

| Collection | Purpose |
|------------|---------|
| **`users`** | Authentication, role (`u` / `p` / `admin`), approval status |
| **`agencyProfiles`** | Agency details, head information, HRM officers |
| **`agencyEmployees`** | Employee data tables, HRM summary, personnel complement |
| **`agencySubmissions`** | Uploaded file metadata (Self-Assessment, Action-Plan, Evidence-Requirements) |
| **`activityLogs`** | Audit log of all user actions (uploads, logins, approvals, etc.) |
| **`deletionRequests`** | File deletion requests with approve/reject workflow |
| **`recommendations`** | Field Office Monitoring data (assistPlan, progressLog, OA status) |
| **`evidenceUnlocks`** | Per-agency unlock state for Evidence Requirements |
| **`activeSessions`** | Real-time heartbeat-based session tracking |
| **`notifications`** | Cross-role agency notifications |
| **`backupHistory`** | Backup run history metadata |
| **`systemConfig`** | System-wide settings (backup config) |

---

## Key Features

### Concurrent User Limit
Agency users are limited to **25 simultaneous sessions**. Admins and CSC RO X are exempt. The limit is enforced at login time with a capacity modal.

### Idle Timeout
All users are automatically logged out after **10 minutes of inactivity**. A warning modal appears after 9 minutes with an **"Extend Session"** button.

### Account Approval
New registrations default to `approvalStatus: "pending"`. Admins must approve accounts through the System Administrator dashboard before users can log in. Email verification is required for email/password accounts.

### Active Users Monitor
Admins can view a real-time table of all logged-in users across all roles at `/active-users-a`, including login time, last active timestamp, and Active/Idle status.

### Firestore Backup System
Admins can configure automatic Firestore backups to Google Drive, run manual backups, estimate sizes, and restore from backup files. Accessible at `/backups-a`.

### Google Drive Folder Structure
Uploaded files are organized automatically:
```
{Agency Name}/
  └── {Year}/
        ├── Self-Assessment, Action-Plan, etc.
        ├── Field Office Monitoring/   ← Assist-Plan, Progress-Log
        └── Recommendations/           ← Capability Card, Guideposts, Narrative Report
```

### Narrative Report Generation
CSC RO X can generate Narrative Reports from an agency's Self-Assessment Excel file. The backend extracts maturity data and injects it into a Word template.

---

## License

This project is proprietary software developed for the Civil Service Commission (CSC) — Region X.
