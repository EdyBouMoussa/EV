"""Script to add payment columns to the bookings table if they don't exist"""
from app import create_app
from extensions import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    try:
        # Check if columns exist and add them if they don't
        with db.engine.connect() as conn:
            # Check if amount column exists
            result = conn.execute(text("""
                SELECT COUNT(*) as count
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'bookings'
                AND COLUMN_NAME = 'amount'
            """))
            if result.fetchone()[0] == 0:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN amount FLOAT DEFAULT 0.0"))
                print("Added 'amount' column")
            
            # Check if payment_status column exists
            result = conn.execute(text("""
                SELECT COUNT(*) as count
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'bookings'
                AND COLUMN_NAME = 'payment_status'
            """))
            if result.fetchone()[0] == 0:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending'"))
                print("Added 'payment_status' column")
            
            # Check if payment_method column exists
            result = conn.execute(text("""
                SELECT COUNT(*) as count
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'bookings'
                AND COLUMN_NAME = 'payment_method'
            """))
            if result.fetchone()[0] == 0:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN payment_method VARCHAR(50)"))
                print("Added 'payment_method' column")
            
            # Check if payment_id column exists
            result = conn.execute(text("""
                SELECT COUNT(*) as count
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'bookings'
                AND COLUMN_NAME = 'payment_id'
            """))
            if result.fetchone()[0] == 0:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN payment_id VARCHAR(100)"))
                print("Added 'payment_id' column")
            
            # Check if created_at column exists
            result = conn.execute(text("""
                SELECT COUNT(*) as count
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'bookings'
                AND COLUMN_NAME = 'created_at'
            """))
            if result.fetchone()[0] == 0:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP"))
                print("Added 'created_at' column")
            
            conn.commit()
            print("All payment columns added successfully!")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

