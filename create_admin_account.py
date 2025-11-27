#!/usr/bin/env python3
"""
Script to create an admin account if it doesn't exist.
Usage: python create_admin_account.py
"""
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app import create_app
from backend.extensions import db
from backend.models import User
from werkzeug.security import generate_password_hash

def create_admin_account():
	"""Create an admin account with email 'admin' and password 'admin' if it doesn't exist"""
	app = create_app()
	
	with app.app_context():
		# Check if admin account already exists
		admin_email = "admin@admin.com"
		existing_admin = User.query.filter_by(email=admin_email).first()
		
		if existing_admin:
			if existing_admin.is_admin:
				print(f"[OK] Admin account already exists: {admin_email}")
				print(f"  Full Name: {existing_admin.full_name or 'N/A'}")
				print(f"  Email: {existing_admin.email}")
				print(f"  Is Admin: {existing_admin.is_admin}")
				return existing_admin
			else:
				# User exists but is not admin - make them admin
				print(f"[WARNING] User '{admin_email}' exists but is not an admin. Making them admin...")
				existing_admin.is_admin = True
				db.session.commit()
				print(f"[OK] User '{admin_email}' is now an admin!")
				return existing_admin
		
		# Check if old "admin" account exists and update it
		old_admin = User.query.filter_by(email="admin").first()
		if old_admin:
			print(f"Found old admin account with email 'admin'. Updating to '{admin_email}'...")
			old_admin.email = admin_email
			old_admin.is_admin = True
			if not old_admin.full_name:
				old_admin.full_name = "Administrator"
			db.session.commit()
			print(f"[OK] Admin account updated successfully!")
			print(f"  Email: {admin_email}")
			print(f"  Password: admin (unchanged)")
			print(f"  Full Name: {old_admin.full_name}")
			return old_admin
		
		# Create new admin account
		print(f"Creating admin account: {admin_email}")
		admin_user = User(
			email=admin_email,
			full_name="Administrator",
			password_hash=generate_password_hash("admin"),
			is_admin=True
		)
		
		try:
			db.session.add(admin_user)
			db.session.commit()
			print(f"[OK] Admin account created successfully!")
			print(f"  Email: {admin_email}")
			print(f"  Password: admin")
			print(f"  Full Name: Administrator")
			print(f"\n[WARNING] Please change the default password in production!")
			return admin_user
		except Exception as e:
			db.session.rollback()
			print(f"[ERROR] Failed to create admin account: {str(e)}")
			import traceback
			traceback.print_exc()
			return None

if __name__ == "__main__":
	create_admin_account()

