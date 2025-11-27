from datetime import datetime, timedelta, time
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import text, func
from werkzeug.utils import secure_filename
import os
import uuid
from ..extensions import db
from ..models import User, EVPort, EVPortSchedule, Booking, UserSubscription
from werkzeug.security import generate_password_hash


admin_bp = Blueprint("admin", __name__)


def check_admin():
	"""Check if current user is admin"""
	user_id = int(get_jwt_identity())
	user = User.query.get(user_id)
	if not user or not user.is_admin:
		raise PermissionError("Admin access required")
	return user


# ========== IMAGE UPLOAD ==========

@admin_bp.post("/upload-image")
@jwt_required()
def upload_image():
	"""Upload an image file"""
	try:
		check_admin()
	except PermissionError as e:
		return jsonify({"message": str(e)}), 403
	
	try:
		if 'image' not in request.files:
			return jsonify({"message": "No image file provided"}), 400
		
		file = request.files['image']
		if file.filename == '':
			return jsonify({"message": "No file selected"}), 400
		
		# Validate file type
		allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'}
		filename = secure_filename(file.filename)
		file_ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
		
		if not file_ext or file_ext not in allowed_extensions:
			return jsonify({"message": f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"}), 400
		
		# Validate file size (max 10MB)
		file.seek(0, os.SEEK_END)
		file_size = file.tell()
		file.seek(0)  # Reset file pointer
		max_size = 10 * 1024 * 1024  # 10MB
		if file_size > max_size:
			return jsonify({"message": f"File too large. Maximum size is 10MB"}), 400
		
		# Create uploads directory if it doesn't exist
		upload_folder = os.path.join(current_app.instance_path, 'uploads')
		try:
			os.makedirs(upload_folder, exist_ok=True)
		except Exception as e:
			return jsonify({"message": f"Failed to create upload directory: {str(e)}"}), 500
		
		# Generate unique filename
		unique_filename = f"{uuid.uuid4().hex}.{file_ext}"
		filepath = os.path.join(upload_folder, unique_filename)
		
		# Save file
		try:
			file.save(filepath)
		except Exception as e:
			return jsonify({"message": f"Failed to save file: {str(e)}"}), 500
		
		# Return URL (relative to /api)
		image_url = f"/api/uploads/{unique_filename}"
		return jsonify({"imageUrl": image_url}), 200
	except Exception as e:
		import traceback
		traceback.print_exc()
		return jsonify({"message": f"Image upload failed: {str(e)}"}), 500


# ========== PORTS MANAGEMENT ==========

@admin_bp.get("/ports")
@jwt_required()
def list_ports_admin():
	"""Get all ports for admin"""
	try:
		check_admin()
	except PermissionError as e:
		return jsonify({"message": str(e)}), 403
	
	try:
		ports = EVPort.query.order_by(EVPort.id.desc()).all()
		return jsonify({"ports": [p.to_dict(include_schedule=True) for p in ports]})
	except Exception as e:
		import traceback
		traceback.print_exc()
		return jsonify({"message": f"Failed to load ports: {str(e)}", "ports": []}), 500


@admin_bp.post("/ports")
@jwt_required()
def create_port():
	"""Create a new port"""
	try:
		check_admin()
	except PermissionError as e:
		return jsonify({"message": str(e)}), 403
	
	try:
		data = request.get_json() or {}
		name = data.get("name")
		city = data.get("city")
		address = data.get("address", "")
		latitude = float(data.get("latitude", 0))
		longitude = float(data.get("longitude", 0))
		connector_type = data.get("connectorType", "")
		power_kw = float(data.get("powerKw", 0)) if data.get("powerKw") else None
		image_url = data.get("imageUrl", "")
		schedules = data.get("schedules", [])  # Array of {weekday, open, close}
		
		if not name or not city:
			return jsonify({"message": "name and city are required"}), 400
		
		port = EVPort(
			name=name,
			city=city,
			address=address,
			latitude=latitude,
			longitude=longitude,
			connector_type=connector_type,
			power_kw=power_kw,
			image_url=image_url,
			is_active=True
		)
		db.session.add(port)
		db.session.flush()  # Get port.id
		
		# Add schedules
		for schedule_data in schedules:
			weekday = schedule_data.get("weekday")
			open_time_str = schedule_data.get("open", "08:00")
			close_time_str = schedule_data.get("close", "22:00")
			
			# Parse time strings
			open_hour, open_min = map(int, open_time_str.split(":"))
			close_hour, close_min = map(int, close_time_str.split(":"))
			
			schedule = EVPortSchedule(
				port_id=port.id,
				weekday=weekday,
				open_time=time(open_hour, open_min),
				close_time=time(close_hour, close_min)
			)
			db.session.add(schedule)
		
		db.session.commit()
		return jsonify({"port": port.to_dict(include_schedule=True)}), 201
	except Exception as e:
		db.session.rollback()
		import traceback
		traceback.print_exc()
		return jsonify({"message": f"Failed to create port: {str(e)}"}), 500


@admin_bp.put("/ports/<int:port_id>")
@jwt_required()
def update_port(port_id):
	"""Update a port"""
	try:
		check_admin()
	except PermissionError as e:
		return jsonify({"message": str(e)}), 403
	
	try:
		port = EVPort.query.get_or_404(port_id)
		data = request.get_json() or {}
		
		# Validate required fields
		if "name" in data and (not data["name"] or not data["name"].strip()):
			return jsonify({"message": "Port name is required"}), 400
		if "city" in data and (not data["city"] or not data["city"].strip()):
			return jsonify({"message": "City is required"}), 400
		
		if "name" in data:
			port.name = data["name"].strip()
		if "city" in data:
			port.city = data["city"].strip()
		if "address" in data:
			port.address = data["address"].strip() if data["address"] else ""
		if "latitude" in data:
			port.latitude = float(data["latitude"])
		if "longitude" in data:
			port.longitude = float(data["longitude"])
		if "connectorType" in data:
			port.connector_type = data["connectorType"] if data["connectorType"] else ""
		if "powerKw" in data:
			port.power_kw = float(data["powerKw"]) if data["powerKw"] else None
		if "imageUrl" in data:
			# Allow empty string to clear image, or set new image URL
			port.image_url = data["imageUrl"] if data["imageUrl"] else ""
		if "isActive" in data:
			port.is_active = bool(data["isActive"])
		
		# Update schedules if provided
		if "schedules" in data:
			# Delete existing schedules
			EVPortSchedule.query.filter_by(port_id=port.id).delete()
			
			# Add new schedules
			for schedule_data in data["schedules"]:
				weekday = schedule_data.get("weekday")
				open_time_str = schedule_data.get("open", "08:00")
				close_time_str = schedule_data.get("close", "22:00")
				
				open_hour, open_min = map(int, open_time_str.split(":"))
				close_hour, close_min = map(int, close_time_str.split(":"))
				
				schedule = EVPortSchedule(
					port_id=port.id,
					weekday=weekday,
					open_time=time(open_hour, open_min),
					close_time=time(close_hour, close_min)
				)
				db.session.add(schedule)
		
		db.session.commit()
		return jsonify({"port": port.to_dict(include_schedule=True)})
	except Exception as e:
		db.session.rollback()
		import traceback
		traceback.print_exc()
		return jsonify({"message": f"Failed to update port: {str(e)}"}), 500


@admin_bp.delete("/ports/<int:port_id>")
@jwt_required()
def delete_port(port_id):
	"""Delete a port"""
	try:
		check_admin()
	except PermissionError as e:
		return jsonify({"message": str(e)}), 403
	
	try:
		port = EVPort.query.get_or_404(port_id)
		db.session.delete(port)
		db.session.commit()
		return jsonify({"message": "Port deleted successfully"})
	except Exception as e:
		db.session.rollback()
		import traceback
		traceback.print_exc()
		return jsonify({"message": f"Failed to delete port: {str(e)}"}), 500


# ========== USERS MANAGEMENT ==========

@admin_bp.get("/users")
@jwt_required()
def list_users():
	"""Get all users"""
	try:
		check_admin()
	except PermissionError as e:
		return jsonify({"message": str(e)}), 403
	
	try:
		users = User.query.order_by(User.id.desc()).all()
		users_data = []
		for user in users:
			user_dict = user.to_dict()
			# Add statistics
			user_dict["bookingsCount"] = Booking.query.filter_by(user_id=user.id).count()
			user_dict["favoritesCount"] = len(user.favorites)
			user_dict["subscriptionsCount"] = UserSubscription.query.filter_by(user_id=user.id, is_active=True).count()
			users_data.append(user_dict)
		
		return jsonify({"users": users_data})
	except Exception as e:
		import traceback
		traceback.print_exc()
		return jsonify({"message": f"Failed to load users: {str(e)}", "users": []}), 500


@admin_bp.put("/users/<int:user_id>")
@jwt_required()
def update_user(user_id):
	"""Update a user (e.g., make admin)"""
	try:
		check_admin()
	except PermissionError as e:
		return jsonify({"message": str(e)}), 403
	
	try:
		user = User.query.get_or_404(user_id)
		data = request.get_json() or {}
		
		if "fullName" in data:
			user.full_name = data["fullName"]
		if "email" in data:
			# Check if email is already taken by another user
			existing = User.query.filter(User.email == data["email"], User.id != user_id).first()
			if existing:
				return jsonify({"message": "Email already in use"}), 400
			user.email = data["email"]
		if "isAdmin" in data:
			user.is_admin = bool(data["isAdmin"])
		if "password" in data and data["password"]:
			user.password_hash = generate_password_hash(data["password"])
		
		db.session.commit()
		return jsonify({"user": user.to_dict()})
	except Exception as e:
		db.session.rollback()
		import traceback
		traceback.print_exc()
		return jsonify({"message": f"Failed to update user: {str(e)}"}), 500


# ========== BOOKINGS MANAGEMENT ==========

@admin_bp.get("/bookings")
@jwt_required()
def list_bookings_admin():
	"""Get all bookings"""
	try:
		check_admin()
	except PermissionError as e:
		return jsonify({"message": str(e)}), 403
	
	try:
		bookings = Booking.query.order_by(Booking.start_time.desc()).all()
		bookings_data = []
		for booking in bookings:
			booking_dict = booking.to_dict()
			booking_dict["port"] = booking.port.to_dict() if booking.port else None
			booking_dict["user"] = booking.user.to_dict() if booking.user else None
			bookings_data.append(booking_dict)
		
		return jsonify({"bookings": bookings_data})
	except Exception as e:
		import traceback
		traceback.print_exc()
		return jsonify({"message": f"Failed to load bookings: {str(e)}", "bookings": []}), 500


# ========== STATISTICS ==========

@admin_bp.get("/stats")
@jwt_required()
def get_stats():
	"""Get admin dashboard statistics"""
	try:
		check_admin()
	except PermissionError as e:
		return jsonify({"message": str(e)}), 403
	
	try:
		stats = {
			"totalUsers": User.query.count(),
			"totalPorts": EVPort.query.count(),
			"activePorts": EVPort.query.filter_by(is_active=True).count(),
			"totalBookings": Booking.query.count(),
			"todayBookings": Booking.query.filter(
				func.date(Booking.start_time) == func.curdate()
			).count(),
			"activeSubscriptions": UserSubscription.query.filter_by(is_active=True).count(),
		}
		
		# Get recent bookings count (last 7 days)
		week_ago = datetime.utcnow() - timedelta(days=7)
		stats["recentBookings"] = Booking.query.filter(Booking.start_time >= week_ago).count()
		
		return jsonify({"stats": stats})
	except Exception as e:
		import traceback
		traceback.print_exc()
		return jsonify({"message": f"Failed to load stats: {str(e)}", "stats": {}}), 500

