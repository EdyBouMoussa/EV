"""Script to make a user an admin - run: python -m backend.make_admin <user_email>"""
import sys
from .app import create_app
from .extensions import db
from .models import User

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m backend.make_admin <user_email>")
        sys.exit(1)
    
    email = sys.argv[1].strip().lower()
    app = create_app()
    
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        if not user:
            print(f"User with email '{email}' not found")
            sys.exit(1)
        
        user.is_admin = True
        db.session.commit()
        print(f"User '{email}' is now an admin!")

