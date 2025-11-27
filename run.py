#!/usr/bin/env python3
"""
Run both backend and frontend servers concurrently.
Cross-platform script that works on Windows, macOS, and Linux.
"""
import subprocess
import sys
import os
import signal
from pathlib import Path

# Get the project root directory
PROJECT_ROOT = Path(__file__).parent
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend"

def run_backend():
    """Run the Flask backend server."""
    print("🚀 Starting backend server...")
    os.chdir(BACKEND_DIR)
    # Check if we're in a virtual environment
    if sys.executable.endswith("python.exe") or "venv" not in sys.executable:
        # Try to use python from the project
        python_cmd = sys.executable
    else:
        python_cmd = sys.executable
    
    return subprocess.Popen(
        [python_cmd, "-m", "backend.app"],
        cwd=str(PROJECT_ROOT),
        env=os.environ.copy()
    )

def run_frontend():
    """Run the Vite frontend server."""
    print("🚀 Starting frontend server...")
    os.chdir(FRONTEND_DIR)
    
    # Check if node_modules exists
    if not (FRONTEND_DIR / "node_modules").exists():
        print("⚠️  node_modules not found. Running 'npm install' first...")
        subprocess.run(["npm", "install"], cwd=str(FRONTEND_DIR), check=True)
    
    return subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=str(FRONTEND_DIR),
        shell=sys.platform == "win32"
    )

def main():
    """Main function to run both servers."""
    print("=" * 50)
    print("🚀 Starting EV Ports Application")
    print("=" * 50)
    print()
    
    processes = []
    
    try:
        # Start backend
        backend_process = run_backend()
        processes.append(backend_process)
        
        # Small delay to let backend start
        import time
        time.sleep(2)
        
        # Start frontend
        frontend_process = run_frontend()
        processes.append(frontend_process)
        
        print()
        print("=" * 50)
        print("✅ Both servers are running!")
        print("=" * 50)
        print("📡 Backend: http://127.0.0.1:5000")
        print("🌐 Frontend: http://localhost:5173")
        print()
        print("Press Ctrl+C to stop both servers...")
        print("=" * 50)
        print()
        
        # Wait for processes
        try:
            # Wait for either process to exit
            while True:
                for proc in processes:
                    if proc.poll() is not None:
                        print(f"\n⚠️  Process exited with code {proc.returncode}")
                        raise KeyboardInterrupt
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Shutting down servers...")
            for proc in processes:
                proc.terminate()
            
            # Wait a bit for graceful shutdown
            time.sleep(2)
            
            # Force kill if still running
            for proc in processes:
                if proc.poll() is None:
                    proc.kill()
            
            print("✅ Servers stopped.")
            sys.exit(0)
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        # Clean up processes on error
        for proc in processes:
            if proc.poll() is None:
                proc.terminate()
                proc.wait()
        sys.exit(1)

if __name__ == "__main__":
    main()

