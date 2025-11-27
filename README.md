# EV Ports Lebanon - Full Stack App

React + Flask + MySQL app to view EV charging ports on a map of Lebanon, authenticate users, and book charging time slots.

## Prerequisites
- Node.js 18+
- Python 3.11+
- MySQL 8.x (local instance)

## 1) Database Setup
1. Start MySQL and create DB and user:
   ```sql
   SOURCE database/init.sql;
   ```
2. Ensure the connection URL matches in backend config:
   - Default: `mysql+pymysql://ev_user:ev_password@127.0.0.1:3306/ev_db`

## 2) Backend Setup
```bash
cd backend
python -m venv .venv
. .venv/Scripts/activate  # Windows PowerShell
pip install -r ../requirements.txt
$env:SECRET_KEY="dev"
$env:JWT_SECRET_KEY="devjwt"
$env:DATABASE_URL="mysql+pymysql://ev_user:ev_password@127.0.0.1:3306/ev_db"
python - <<EOF
from backend.app import create_app
from backend.extensions import db
app = create_app()
with app.app_context():
    db.create_all()
EOF
python -m backend.seed
python -m backend.app  # starts on http://127.0.0.1:5000
```

- Health check: `http://127.0.0.1:5000/api/health`

## 3) Frontend Setup
```bash
cd frontend
npm install
npm run dev  # http://127.0.0.1:5173 (proxy to backend)
```

## 4) Running the Application

### Quick Start (Recommended)

You can run both backend and frontend servers with a single command:

**Windows (PowerShell):**
```powershell
.\run.ps1
```

**Windows (Command Prompt):**
```cmd
run.bat
```

**Cross-platform (Python):**
```bash
python run.py
```

All scripts will:
- Automatically check and install frontend dependencies if needed
- Start the backend server on `http://127.0.0.1:5000`
- Start the frontend server on `http://localhost:5173`
- Display status messages and URLs
- Allow you to stop both servers with Ctrl+C

### Manual Start (Alternative)

If you prefer to run them separately:

**Terminal 1 - Backend:**
```bash
cd backend
python -m backend.app
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## API Overview
- Auth
  - POST `/api/auth/signup` { fullName, email, password }
  - POST `/api/auth/login` { email, password }
  - GET `/api/auth/me` (Bearer token)
- Ports
  - GET `/api/ports`
  - GET `/api/ports/:id`
- Bookings (auth required)
  - GET `/api/bookings`
  - POST `/api/bookings` { portId, startTime, endTime }
  - DELETE `/api/bookings/:id`

## Notes
- Map uses OpenStreetMap tiles via Leaflet.
- Seed script adds a few Lebanese ports with daily 8:00–22:00 schedules.
- For production, move secrets to environment variables and configure HTTPS.






