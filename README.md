# EV Ports Lebanon - Full Stack App

React + Flask + MySQL app to view EV charging ports on a map of Lebanon, authenticate users, and book charging time slots.

## Prerequisites
- **Node.js 18+** - [Download](https://nodejs.org/)
- **Python 3.11+** - [Download](https://www.python.org/downloads/)
- **MySQL 8.x** - [Download](https://dev.mysql.com/downloads/mysql/)

## First Time Setup (New Installation)

### Quick Setup (Automated)

Run the setup script to initialize everything:

**Windows (Recommended):**
```cmd
setup.bat
```

**Cross-platform (Python):**
```bash
python setup.py
```

This will:
- ✅ Check prerequisites (Python, Node.js, npm)
- ✅ Guide you through database setup
- ✅ Create Python virtual environment
- ✅ Install all dependencies (including cryptography)
- ✅ Create database tables
- ✅ Seed sample data
- ✅ Install frontend dependencies

### Manual Setup (Step by Step)

#### Step 1: Database Setup

1. **Start MySQL server** (make sure MySQL service is running)

2. **Create database and user:**
   
   **Option A: Using MySQL command line:**
   ```bash
   mysql -u root -p
   ```
   Then run:
   ```sql
   SOURCE database/init.sql;
   ```
   
   **Option B: Using MySQL Workbench:**
   - Open MySQL Workbench
   - Connect to your MySQL server
   - File → Open SQL Script → Select `database/init.sql`
   - Execute the script

   **Option C: Manual SQL:**
   ```sql
   CREATE DATABASE IF NOT EXISTS ev_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER IF NOT EXISTS 'ev_user'@'localhost' IDENTIFIED BY 'ev_password';
   GRANT ALL PRIVILEGES ON ev_db.* TO 'ev_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

3. **Verify connection URL** in `backend/config.py`:
   - Default: `mysql+pymysql://ev_user:ev_password@127.0.0.1:3306/ev_db`
   - You can override with `DATABASE_URL` environment variable

#### Step 2: Backend Setup

1. **Create virtual environment:**
   ```bash
   cd backend
   python -m venv .venv
   ```

2. **Activate virtual environment:**
   
   **Windows (PowerShell):**
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```
   
   **Windows (Command Prompt):**
   ```cmd
   .venv\Scripts\activate.bat
   ```
   
   **macOS/Linux:**
   ```bash
   source .venv/bin/activate
   ```

3. **Install Python dependencies:**
   ```bash
   pip install -r ../requirements.txt
   ```
   (cryptography is now included in requirements.txt)

4. **Set environment variables (optional, defaults are provided):**
   
   **Windows (PowerShell):**
   ```powershell
   $env:SECRET_KEY="dev"
   $env:JWT_SECRET_KEY="devjwt"
   $env:DATABASE_URL="mysql+pymysql://ev_user:ev_password@127.0.0.1:3306/ev_db"
   ```
   
   **Windows (Command Prompt):**
   ```cmd
   set SECRET_KEY=dev
   set JWT_SECRET_KEY=devjwt
   set DATABASE_URL=mysql+pymysql://ev_user:ev_password@127.0.0.1:3306/ev_db
   ```
   
   **macOS/Linux:**
   ```bash
   export SECRET_KEY="dev"
   export JWT_SECRET_KEY="devjwt"
   export DATABASE_URL="mysql+pymysql://ev_user:ev_password@127.0.0.1:3306/ev_db"
   ```

5. **Create database tables:**
   ```bash
   cd ..  # Go back to project root
   python -c "from backend.app import create_app; from backend.extensions import db; app = create_app(); app.app_context().push(); db.create_all()"
   ```

6. **Seed sample data:**
   ```bash
   python -m backend.seed
   ```

7. **Verify backend is working:**
   ```bash
   python -m backend.app
   ```
   - Health check: `http://127.0.0.1:5000/api/health`

#### Step 3: Frontend Setup

1. **Install Node.js dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Verify frontend is working:**
   ```bash
   npm run dev
   ```
   - Frontend will be available at `http://localhost:5173`

## Running the Application

After setup is complete, you can run the application:

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

## Troubleshooting

### Database Connection Issues
- **Error: "cryptography package is required"**
  - Solution: `pip install cryptography` in your virtual environment

- **Error: "Access denied for user"**
  - Solution: Make sure MySQL is running and the user `ev_user` exists with correct password
  - Check `backend/config.py` for the correct connection string

- **Error: "Unknown database 'ev_db'"**
  - Solution: Run `database/init.sql` in MySQL to create the database

### Virtual Environment Issues
- **Error: "No module named 'backend'"**
  - Solution: Make sure you're running from the project root, not the `backend` directory
  - Use: `python -m backend.app` from project root

- **Error: "venv not found"**
  - Solution: Create it with `python -m venv backend/.venv`

### Port Already in Use
- **Error: "Address already in use"**
  - Backend (port 5000): Change port in `backend/app.py` or stop the process using port 5000
  - Frontend (port 5173): Vite will automatically try the next available port

## Reset Database

To reset the database and start fresh:

```bash
python reset_database.py
python -m backend.seed
```

Or manually in MySQL:
```sql
SOURCE database/reset.sql;
```

Then restart your Flask app or run `python -m backend.seed`

## Notes
- Map uses OpenStreetMap tiles via Leaflet.
- Seed script adds a few Lebanese ports with daily 8:00–22:00 schedules.
- For production, move secrets to environment variables and configure HTTPS.
- The `.venv` folder is in `.gitignore` - each developer needs to create their own virtual environment.






