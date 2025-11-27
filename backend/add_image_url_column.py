#!/usr/bin/env python3
"""
Script to add image_url column to ev_ports table.
Usage: python -m backend.add_image_url_column
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app
from backend.extensions import db
from sqlalchemy import text

def add_image_url_column():
	"""Add image_url column to ev_ports table"""
	app = create_app()
	
	with app.app_context():
		try:
			# Check if column already exists
			result = db.session.execute(text("""
				SELECT COUNT(*) as count
				FROM information_schema.COLUMNS
				WHERE TABLE_SCHEMA = DATABASE()
				AND TABLE_NAME = 'ev_ports'
				AND COLUMN_NAME = 'image_url'
			"""))
			
			exists = result.fetchone()[0] > 0
			
			if exists:
				print("[OK] Column 'image_url' already exists in ev_ports table")
				return
			
			# Add the column
			print("Adding image_url column to ev_ports table...")
			db.session.execute(text("""
				ALTER TABLE ev_ports
				ADD COLUMN image_url VARCHAR(500) NULL
			"""))
			db.session.commit()
			print("[OK] Successfully added image_url column to ev_ports table")
		except Exception as e:
			db.session.rollback()
			print(f"[ERROR] Failed to add image_url column: {str(e)}")
			import traceback
			traceback.print_exc()

if __name__ == "__main__":
	add_image_url_column()

