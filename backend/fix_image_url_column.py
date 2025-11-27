#!/usr/bin/env python3
"""
Script to increase image_url column size to handle longer URLs/base64 data.
Usage: python -m backend.fix_image_url_column
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app
from backend.extensions import db
from sqlalchemy import text

def fix_image_url_column():
	"""Change image_url column to TEXT to handle longer URLs/base64 data"""
	app = create_app()
	
	with app.app_context():
		try:
			print("Updating image_url column to TEXT type...")
			db.session.execute(text("""
				ALTER TABLE ev_ports
				MODIFY COLUMN image_url TEXT NULL
			"""))
			db.session.commit()
			print("[OK] Successfully updated image_url column to TEXT type")
		except Exception as e:
			db.session.rollback()
			print(f"[ERROR] Failed to update image_url column: {str(e)}")
			import traceback
			traceback.print_exc()

if __name__ == "__main__":
	fix_image_url_column()

