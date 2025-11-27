#!/usr/bin/env python3
"""
Setup script for EV Ports Application
Run this after cloning the repository to initialize everything.
"""
import os
import sys
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend"


def print_step(step_num, message):
    """Print a formatted step message."""
    print(f"\n{'='*60}")
    print(f"Step {step_num}: {message}")
    print('='*60)


def check_prerequisites():
    """Check if required software is installed."""
    print_step(1, "Checking Prerequisites")
    
    # Check Python
    try:
        python_version = subprocess.check_output(
            [sys.executable, "--version"], stderr=subprocess.STDOUT, text=True
        ).strip()
        print(f"✅ {python_version}")
    except Exception as e:
        print(f"❌ Python not found! Please install Python 3.11+")
        return False
    
    # Check Node.js
    try:
        node_version = subprocess.check_output(
            ["node", "--version"], stderr=subprocess.STDOUT, text=True
        ).strip()
        print(f"✅ Node.js {node_version}")
    except Exception as e:
        print(f"❌ Node.js not found! Please install Node.js 18+")
        return False
    
    # Check npm
    try:
        npm_version = subprocess.check_output(
            ["npm", "--version"], stderr=subprocess.STDOUT, text=True
        ).strip()
        print(f"✅ npm {npm_version}")
    except Exception as e:
        print(f"❌ npm not found!")
        return False
    
    # Check MySQL (optional - just warn if not found)
    try:
        mysql_version = subprocess.check_output(
            ["mysql", "--version"], stderr=subprocess.STDOUT, text=True
        ).strip()
        print(f"✅ MySQL found: {mysql_version}")
    except Exception as e:
        print(f"⚠️  MySQL not found in PATH (you may need to set it up manually)")
    
    return True


def setup_database():
    """Guide user through database setup."""
    print_step(2, "Database Setup")
    print("\n📋 Database Setup Instructions:")
    print("1. Start your MySQL server")
    print("2. Open MySQL command line or MySQL Workbench")
    print("3. Run the following command:")
    print(f"   SOURCE {PROJECT_ROOT / 'database' / 'init.sql'};")
    print("\n   Or manually run:")
    print("   CREATE DATABASE IF NOT EXISTS ev_db;")
    print("   CREATE USER IF NOT EXISTS 'ev_user'@'localhost' IDENTIFIED BY 'ev_password';")
    print("   GRANT ALL PRIVILEGES ON ev_db.* TO 'ev_user'@'localhost';")
    print("   FLUSH PRIVILEGES;")
    print("\n⚠️  Make sure MySQL is running before continuing!")
    
    response = input("\nHave you set up the database? (y/n): ").strip().lower()
    return response == 'y'


def setup_backend():
    """Set up Python virtual environment and install dependencies."""
    print_step(3, "Backend Setup")
    
    # Create virtual environment
    venv_path = BACKEND_DIR / ".venv"
    if not venv_path.exists():
        print("Creating virtual environment...")
        subprocess.run([sys.executable, "-m", "venv", str(venv_path)], check=True)
        print("✅ Virtual environment created")
    else:
        print("✅ Virtual environment already exists")
    
    # Determine Python executable
    if sys.platform == "win32":
        python_exe = venv_path / "Scripts" / "python.exe"
        pip_exe = venv_path / "Scripts" / "pip.exe"
    else:
        python_exe = venv_path / "bin" / "python"
        pip_exe = venv_path / "bin" / "pip"
    
    # Install dependencies
    print("\nInstalling Python dependencies...")
    requirements_file = PROJECT_ROOT / "requirements.txt"
    subprocess.run([str(pip_exe), "install", "-r", str(requirements_file)], check=True)
    print("✅ Dependencies installed")
    
    # Install cryptography if not in requirements
    print("\nChecking for cryptography package...")
    result = subprocess.run(
        [str(python_exe), "-c", "import cryptography"],
        capture_output=True
    )
    if result.returncode != 0:
        print("Installing cryptography (required for MySQL)...")
        subprocess.run([str(pip_exe), "install", "cryptography"], check=True)
        print("✅ cryptography installed")
    else:
        print("✅ cryptography already installed")
    
    # Create database tables
    print("\nCreating database tables...")
    try:
        subprocess.run(
            [str(python_exe), "-c", 
             "from backend.app import create_app; from backend.extensions import db; "
             "app = create_app(); app.app_context().push(); db.create_all()"],
            cwd=str(PROJECT_ROOT),
            check=True
        )
        print("✅ Database tables created")
    except subprocess.CalledProcessError as e:
        print(f"⚠️  Warning: Could not create tables. Error: {e}")
        print("   Make sure MySQL is running and database is set up!")
        return False
    
    # Seed database
    print("\nSeeding database with sample data...")
    try:
        subprocess.run(
            [str(python_exe), "-m", "backend.seed"],
            cwd=str(PROJECT_ROOT),
            check=True
        )
        print("✅ Database seeded")
    except subprocess.CalledProcessError as e:
        print(f"⚠️  Warning: Could not seed database. Error: {e}")
    
    return True


def setup_frontend():
    """Set up frontend dependencies."""
    print_step(4, "Frontend Setup")
    
    print("Installing Node.js dependencies...")
    subprocess.run(["npm", "install"], cwd=str(FRONTEND_DIR), check=True)
    print("✅ Frontend dependencies installed")
    
    return True


def main():
    """Main setup function."""
    print("\n" + "="*60)
    print("🚀 EV Ports Application - Setup Script")
    print("="*60)
    
    # Check prerequisites
    if not check_prerequisites():
        print("\n❌ Prerequisites check failed. Please install missing software.")
        sys.exit(1)
    
    # Database setup
    if not setup_database():
        print("\n⚠️  Please set up the database before continuing.")
        response = input("Continue anyway? (y/n): ").strip().lower()
        if response != 'y':
            sys.exit(1)
    
    # Backend setup
    if not setup_backend():
        print("\n⚠️  Backend setup had issues. Please check the errors above.")
        response = input("Continue anyway? (y/n): ").strip().lower()
        if response != 'y':
            sys.exit(1)
    
    # Frontend setup
    if not setup_frontend():
        print("\n❌ Frontend setup failed.")
        sys.exit(1)
    
    # Success message
    print("\n" + "="*60)
    print("✅ Setup Complete!")
    print("="*60)
    print("\nYou can now run the application using:")
    print("  - Windows: run.bat")
    print("  - PowerShell: .\\run.ps1")
    print("  - Python: python run.py")
    print("\nOr manually:")
    print("  Backend: cd backend && .venv\\Scripts\\activate && python -m backend.app")
    print("  Frontend: cd frontend && npm run dev")
    print("\n" + "="*60)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nSetup cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Setup failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

