# PRIME-HRM Reference Library

A web application for managing the submission and review of PRIME-HRM (Program to Institutionalize Meritocracy and Excellence in Human Resource Management) assessment documents. Built for the **Civil Service Commission (CSC)** and government agencies under **Region X (Northern Mindanao)**.

---

## Overview

The PRIME-HRM Reference Library streamlines the document workflow between government agencies and CSC reviewers. Agencies complete their profiles, upload Self-Assessment and Assist-Plan Excel files, and track their progress through a gated 6-step workflow. CSC PRIME-HRM Officers and System Administrators review submissions, approve or reject them, and monitor system activity through dedicated dashboards.

---

## User Roles

The application supports three distinct user types:

| Role | Description |
|------|-------------|
| **Agency User** | Government agencies / LGUs who complete agency profiles, manage employee data, upload assessment files, and track submission progress. |
| **PRIME-HRM Officer** | CSC reviewers who view agency dashboards, review pending submissions, and approve or reject uploaded files. |
| **System Administrator** | Admins who manage user registrations, view system-wide statistics, and monitor audit logs of all user actions. |

---

## Workflow

Agencies progress through a gated 6-step workflow:

1. **Complete Agency Profile** — Agency details, head information, and HRM officer data
2. **Submit Employee Data** — Personnel complement and HRM summary tables
3. **Upload Self-Assessment** — Excel file upload (unlocked only after Steps 1 & 2 are complete)
4. **PRIME Review** — Officers review the Self-Assessment and approve or reject it
5. **Upload Assist-Plan** — Excel file upload (unlocked only after Self-Assessment approval)
6. **Final Review** — Officers review and approve or reject the Assist-Plan

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 8, React Router DOM 7 |
| Backend | Express.js 5 (Node.js) |
| Authentication | Firebase Auth (Email/Password + Google Sign-In) |
| Database | Firebase Firestore |
| File Storage | Google Drive (via Google Drive API v3) |
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

#### Frontend
No `.env` file is required for local development. The Firebase configuration is hardcoded in `src/firebase/config.js`. The backend API URL defaults to `http://localhost:5000`.

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

---

## Project Structure

```
CSC-Reference-Library/
├── backend/                    # Express.js backend
│   ├── server.js               # Main API server
│   ├── .env                    # Google API credentials (gitignored)
│   ├── .env.example            # Env var template
│   ├── package.json
│   └── Dockerfile              # Backend container image
├── src/
│   ├── App.jsx                 # Root router with role-based routes
│   ├── firebase/               # Firebase config and activity logging
│   ├── hooks/                  # Central data hooks (useAgencyData)
│   ├── utils/                  # Shared utilities (date formatting, validation)
│   ├── components/             # Layouts, guards, modals
│   ├── pages/                  # Role-based page components
│   │   ├── lgu/                # Agency user pages
│   │   ├── prime/              # PRIME officer pages
│   │   └── admin/              # Admin pages
│   └── css/                    # Component and page styles
├── Dockerfile                  # Frontend container image
├── docker-compose.yml          # Local staging orchestration
├── nginx.conf                  # Reverse proxy configuration
├── package.json                # Frontend dependencies
└── vite.config.js              # Vite configuration
```

---

## Firestore Collections

The app uses five main Firestore collections:

1. **`users`** — Authentication and role data (`u`, `p`, `admin`)
2. **`agencyProfiles`** — Agency details, head information, and HRM officers
3. **`agencyEmployees`** — Employee data tables by category, status, and gender
4. **`agencySubmissions`** — Uploaded file metadata (Self-Assessment, Assist-Plan)
5. **`activityLogs`** — Audit log of all user actions

---

## Account Approval

New registrations default to `approvalStatus: "pending"`. Admins must approve accounts through the System Administrator dashboard before users can log in. This applies to both email/password and Google sign-in registrations.

---

## License

This project is proprietary software developed for the Civil Service Commission (CSC) — Region X.
