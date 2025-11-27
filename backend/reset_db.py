"""Script to reset the database - drops all tables and recreates them"""
from .app import create_app
from .extensions import db


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        try:
            print("Dropping all tables...")
            db.drop_all()
            print("Creating all tables...")
            db.create_all()
            print("Database reset complete!")
            print("\nTables recreated:")
            print("- users")
            print("- ev_ports")
            print("- ev_port_schedules")
            print("- bookings")
            print("- favorites")
            print("\nTo seed sample data, run: python -m backend.seed")
        except Exception as e:
            print(f"Error resetting database: {e}")
            import traceback
            traceback.print_exc()
