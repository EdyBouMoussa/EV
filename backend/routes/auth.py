from flask import Blueprint, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from ..extensions import db
from ..models import User


auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/signup")
def signup():
	try:
		data = request.get_json() or {}
		email = (data.get("email") or "").strip().lower()
		password = data.get("password") or ""
		full_name = (data.get("fullName") or "").strip()
		if not email or not password:
			return {"message": "email and password are required"}, 400
		if User.query.filter_by(email=email).first():
			return {"message": "email already registered"}, 409
		
		# Create user - handle is_admin column if it doesn't exist
		try:
			user = User(email=email, full_name=full_name, password_hash=generate_password_hash(password), is_admin=False)
		except Exception:
			# If is_admin column doesn't exist, create without it
			user = User(email=email, full_name=full_name, password_hash=generate_password_hash(password))
		
		db.session.add(user)
		try:
			db.session.commit()
		except Exception as e:
			db.session.rollback()
			# If commit fails due to missing is_admin column, try using raw SQL
			from sqlalchemy import text
			try:
				db.session.execute(
					text("""
						INSERT INTO users (email, full_name, password_hash)
						VALUES (:email, :full_name, :password_hash)
					"""),
					{
						"email": email,
						"full_name": full_name,
						"password_hash": generate_password_hash(password)
					}
				)
				db.session.commit()
				# Get the created user
				user = User.query.filter_by(email=email).first()
			except Exception as e2:
				db.session.rollback()
				import traceback
				traceback.print_exc()
				return {"message": f"Failed to create account: {str(e2)}"}, 500
		
		access_token = create_access_token(identity=str(user.id))
		return {"accessToken": access_token, "user": user.to_dict()}, 201
	except Exception as e:
		db.session.rollback()
		import traceback
		traceback.print_exc()
		return {"message": f"Signup failed: {str(e)}"}, 500


@auth_bp.post("/login")
def login():
	data = request.get_json() or {}
	email = (data.get("email") or "").strip().lower()
	password = data.get("password") or ""
	user = User.query.filter_by(email=email).first()
	if not user or not check_password_hash(user.password_hash, password):
		return {"message": "invalid credentials"}, 401
	access_token = create_access_token(identity=str(user.id))
	return {"accessToken": access_token, "user": user.to_dict()}, 200


@auth_bp.post("/admin/login")
def admin_login():
	"""Admin-only login endpoint - only allows users with is_admin=True"""
	data = request.get_json() or {}
	email = (data.get("email") or "").strip().lower()
	password = data.get("password") or ""
	user = User.query.filter_by(email=email).first()
	
	if not user or not check_password_hash(user.password_hash, password):
		return {"message": "invalid credentials"}, 401
	
	# Check if user is admin
	if not user.is_admin:
		return {"message": "admin access required - this account is not an admin"}, 403
	
	access_token = create_access_token(identity=str(user.id))
	return {"accessToken": access_token, "user": user.to_dict()}, 200


@auth_bp.get("/me")
@jwt_required()
def me():
	user_id = get_jwt_identity()
	user = User.query.get(user_id)
	return {"user": user.to_dict() if user else None}, 200





