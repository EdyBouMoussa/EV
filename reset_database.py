"""Simple script to reset the database - run from project root"""
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.app import create_app
from backend.extensions import db

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        try:
            print("Dropping all tables...")
            db.drop_all()
            print("Creating all tables...")
            db.create_all()
            print("\nDatabase reset complete!")
            print("\nTables recreated:")
            print("  - users")
            print("  - ev_ports")
            print("  - ev_port_schedules")
            print("  - bookings")
            print("  - favorites")
            print("\nTo seed sample data, run: python -m backend.seed")
        except Exception as e:
            print(f"Error resetting database: {e}")
            import traceback
            traceback.print_exc()

