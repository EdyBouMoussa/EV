"""Script to make the first user an admin - run from project root: python make_first_admin.py"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.app import create_app
from backend.extensions import db
from backend.models import User

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        # Get the first user (oldest user)
        first_user = User.query.order_by(User.id.asc()).first()
        if not first_user:
            print("No users found. Please sign up first.")
            sys.exit(1)
        
        first_user.is_admin = True
        db.session.commit()
        print(f"User '{first_user.email}' (ID: {first_user.id}) is now an admin!")
        print("You can now access the admin panel at /admin")

