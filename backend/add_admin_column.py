"""Script to add is_admin column to users table"""
from .app import create_app
from .extensions import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    try:
        with db.engine.connect() as conn:
            # Check if is_admin column exists
            result = conn.execute(text("""
                SELECT COUNT(*) as count
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'users'
                AND COLUMN_NAME = 'is_admin'
            """))
            if result.fetchone()[0] == 0:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE NOT NULL"))
                conn.commit()
                print("Added 'is_admin' column to users table")
            else:
                print("'is_admin' column already exists")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

