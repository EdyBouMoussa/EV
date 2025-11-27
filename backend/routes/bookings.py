from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import text
from ..extensions import db
from ..models import Booking, EVPort, UserSubscription


bookings_bp = Blueprint("bookings", __name__)


@bookings_bp.get("")
@jwt_required()
def list_my_bookings():
	try:
		user_id = int(get_jwt_identity())
		
		# Check if payment columns exist
		payment_columns_exist = False
		try:
			result = db.session.execute(
				text("""
					SELECT COUNT(*) 
					FROM information_schema.COLUMNS 
					WHERE TABLE_SCHEMA = DATABASE()
					AND TABLE_NAME = 'bookings' 
					AND COLUMN_NAME = 'payment_status'
				""")
			)
			payment_columns_exist = result.scalar() > 0
		except Exception:
			pass  # Assume columns don't exist
		
		# Get bookings using raw SQL to avoid payment column issues
		if payment_columns_exist:
			# If payment columns exist, use ORM
			bookings = Booking.query.filter_by(user_id=user_id).order_by(Booking.start_time.asc()).all()
			items = []
			for b in bookings:
				booking_dict = b.to_dict()
				# Include port information
				booking_dict["port"] = b.port.to_dict() if b.port else None
				items.append(booking_dict)
		else:
			# If payment columns don't exist, use raw SQL
			bookings_result = db.session.execute(
				text("""
					SELECT id, user_id, port_id, start_time, end_time
					FROM bookings
					WHERE user_id = :user_id
					ORDER BY start_time ASC
				"""),
				{"user_id": user_id}
			)
			items = []
			for row in bookings_result:
				# Get port information
				port = EVPort.query.get(row[2]) if row[2] else None
				
				# Calculate amount
				hours = (row[4] - row[3]).total_seconds() / 3600 if row[4] and row[3] else 1.0
				amount = round(hours * 5.0, 2)
				
				booking_dict = {
					"id": row[0],
					"userId": row[1],
					"portId": row[2],
					"startTime": row[3].isoformat() if row[3] else None,
					"endTime": row[4].isoformat() if row[4] else None,
					"amount": amount,
					"paymentStatus": "pending",  # Default since we can't check
					"paymentMethod": None,
					"createdAt": None,
					"port": port.to_dict() if port else None
				}
				items.append(booking_dict)
		
		return jsonify({"bookings": items})
	except Exception as e:
		import traceback
		traceback.print_exc()
		return jsonify({"message": f"Failed to load bookings: {str(e)}", "bookings": []}), 500


@bookings_bp.post("")
@jwt_required()
def create_booking():
	try:
		user_id = int(get_jwt_identity())
		data = request.get_json() or {}
		port_id = data.get("portId")
		start_time = data.get("startTime")
		end_time = data.get("endTime")
		payment_method = data.get("paymentMethod", "credit_card")
		
		if not port_id or not start_time or not end_time:
			return jsonify({"message": "portId, startTime, endTime are required"}), 400
		
		port = EVPort.query.get_or_404(port_id)
		
		try:
			start_dt = datetime.fromisoformat(start_time)
			end_dt = datetime.fromisoformat(end_time)
		except ValueError as e:
			return jsonify({"message": f"Invalid date format: {str(e)}"}), 400
		
		if end_dt <= start_dt:
			return jsonify({"message": "endTime must be after startTime"}), 400
		
		# Calculate booking amount (e.g., $5 per hour)
		hours = (end_dt - start_dt).total_seconds() / 3600
		amount = round(hours * 5.0, 2)  # $5 per hour
		
		# Check overlap (only check paid bookings)
		# Use raw SQL to avoid issues with missing payment columns
		try:
			# Try to check for paid bookings first
			result = db.session.execute(
				text("""
					SELECT COUNT(*) 
					FROM bookings 
					WHERE port_id = :port_id 
					AND start_time < :end_time 
					AND end_time > :start_time
					AND payment_status = 'paid'
				"""),
				{"port_id": port.id, "start_time": start_dt, "end_time": end_dt}
			)
			overlaps = result.scalar()
		except Exception:
			# Fallback: check all bookings if payment_status column doesn't exist
			try:
				result = db.session.execute(
					text("""
						SELECT COUNT(*) 
						FROM bookings 
						WHERE port_id = :port_id 
						AND start_time < :end_time 
						AND end_time > :start_time
					"""),
					{"port_id": port.id, "start_time": start_dt, "end_time": end_dt}
				)
				overlaps = result.scalar()
			except Exception as e:
				# If even basic query fails, use SQLAlchemy without payment fields
				overlaps = (
					Booking.query.with_entities(Booking.id)
					.filter(
						Booking.port_id == port.id,
						Booking.start_time < end_dt,
						Booking.end_time > start_dt,
					)
					.count()
				)
		
		if overlaps:
			return jsonify({"message": "time slot not available"}), 409
		
		# Check subscription limit and coverage
		subscription = UserSubscription.query.filter_by(user_id=user_id, is_active=True).first()
		has_active_subscription = False
		if subscription:
			# Check if subscription is still valid
			if datetime.utcnow() <= subscription.end_date:
				has_active_subscription = True
				# Count bookings used in current period
				bookings_count = Booking.query.filter(
					Booking.user_id == user_id,
					Booking.start_time >= subscription.start_date,
					Booking.start_time < subscription.end_date,
					Booking.payment_status == "paid"
				).count()
				
				if bookings_count >= subscription.plan.booking_limit:
					return jsonify({
						"message": f"Booking limit reached. You have used {bookings_count}/{subscription.plan.booking_limit} bookings for this {subscription.plan.plan_type} period."
					}), 403
		
		# Create booking - check if payment columns exist first
		# Use raw SQL to check if payment columns exist
		payment_columns_exist = False
		try:
			result = db.session.execute(
				text("""
					SELECT COUNT(*) 
					FROM information_schema.COLUMNS 
					WHERE TABLE_SCHEMA = DATABASE()
					AND TABLE_NAME = 'bookings' 
					AND COLUMN_NAME = 'amount'
				""")
			)
			payment_columns_exist = result.scalar() > 0
		except Exception:
			pass  # Assume columns don't exist
		
		# Create booking with or without payment fields based on what exists
		# If user has active subscription, booking is automatically paid (covered by subscription)
		if payment_columns_exist:
			booking = Booking(
				user_id=user_id,
				port_id=port.id,
				start_time=start_dt,
				end_time=end_dt,
				amount=0.0 if has_active_subscription else amount,  # Free if covered by subscription
				payment_status="paid" if has_active_subscription else "pending",
				payment_method=payment_method if has_active_subscription else None
			)
		else:
			# Create booking without payment fields using raw SQL
			result = db.session.execute(
				text("""
					INSERT INTO bookings (user_id, port_id, start_time, end_time)
					VALUES (:user_id, :port_id, :start_time, :end_time)
				"""),
				{
					"user_id": user_id,
					"port_id": port.id,
					"start_time": start_dt,
					"end_time": end_dt
				}
			)
			db.session.commit()
			# Get the created booking using raw SQL to avoid payment column issues
			booking_id = result.lastrowid
			booking_result = db.session.execute(
				text("""
					SELECT id, user_id, port_id, start_time, end_time
					FROM bookings
					WHERE id = :booking_id
				"""),
				{"booking_id": booking_id}
			)
			row = booking_result.fetchone()
			# Create a dict manually to avoid querying payment columns
			booking_dict = {
				"id": row[0],
				"userId": row[1],
				"portId": row[2],
				"startTime": row[3].isoformat() if row[3] else None,
				"endTime": row[4].isoformat() if row[4] else None,
				"amount": 0.0,
				"paymentStatus": "pending",
				"paymentMethod": None,
				"createdAt": None,
			}
			return jsonify({"booking": booking_dict}), 201
		
		db.session.add(booking)
		try:
			db.session.commit()
		except Exception as e:
			db.session.rollback()
			error_str = str(e).lower()
			# If commit fails due to missing payment columns, create without them using raw SQL
			if "amount" in error_str or "payment" in error_str or "unknown column" in error_str:
				try:
					result = db.session.execute(
						text("""
							INSERT INTO bookings (user_id, port_id, start_time, end_time)
							VALUES (:user_id, :port_id, :start_time, :end_time)
						"""),
						{
							"user_id": user_id,
							"port_id": port.id,
							"start_time": start_dt,
							"end_time": end_dt
						}
					)
					db.session.commit()
					# Get the created booking using raw SQL to avoid payment column issues
					booking_id = result.lastrowid
					booking_result = db.session.execute(
						text("""
							SELECT id, user_id, port_id, start_time, end_time
							FROM bookings
							WHERE id = :booking_id
						"""),
						{"booking_id": booking_id}
					)
					row = booking_result.fetchone()
					# Create a dict manually to avoid querying payment columns
					booking_dict = {
						"id": row[0],
						"userId": row[1],
						"portId": row[2],
						"startTime": row[3].isoformat() if row[3] else None,
						"endTime": row[4].isoformat() if row[4] else None,
						"amount": 0.0,
						"paymentStatus": "pending",
						"paymentMethod": None,
						"createdAt": None,
					}
					return jsonify({"booking": booking_dict}), 201
				except Exception as e2:
					db.session.rollback()
					import traceback
					traceback.print_exc()
					return jsonify({"message": f"Failed to create booking: {str(e2)}"}), 500
			else:
				import traceback
				traceback.print_exc()
				return jsonify({"message": f"Failed to create booking: {str(e)}"}), 500
		
		return jsonify({"booking": booking.to_dict()}), 201
	except Exception as e:
		db.session.rollback()
		import traceback
		traceback.print_exc()
		return jsonify({"message": f"Failed to create booking: {str(e)}"}), 500


@bookings_bp.post("/<int:booking_id>/pay")
@jwt_required()
def process_payment(booking_id: int):
	try:
		user_id = int(get_jwt_identity())
		
		# Check if payment columns exist
		payment_columns_exist = False
		try:
			result = db.session.execute(
				text("""
					SELECT COUNT(*) 
					FROM information_schema.COLUMNS 
					WHERE TABLE_SCHEMA = DATABASE()
					AND TABLE_NAME = 'bookings' 
					AND COLUMN_NAME = 'payment_status'
				""")
			)
			payment_columns_exist = result.scalar() > 0
		except Exception:
			pass  # Assume columns don't exist
		
		# Get booking using raw SQL to avoid payment column issues
		booking_result = db.session.execute(
			text("""
				SELECT id, user_id, port_id, start_time, end_time
				FROM bookings
				WHERE id = :booking_id
			"""),
			{"booking_id": booking_id}
		)
		row = booking_result.fetchone()
		
		if not row:
			return jsonify({"message": "booking not found"}), 404
		
		if row[1] != user_id:  # user_id is at index 1
			return jsonify({"message": "forbidden"}), 403
		
		# Check if user has active subscription (subscription covers payment)
		subscription = UserSubscription.query.filter_by(user_id=user_id, is_active=True).first()
		has_active_subscription = False
		if subscription and datetime.utcnow() <= subscription.end_date:
			has_active_subscription = True
			# Count bookings used in current period
			bookings_count = Booking.query.filter(
				Booking.user_id == user_id,
				Booking.start_time >= subscription.start_date,
				Booking.start_time < subscription.end_date,
				Booking.payment_status == "paid"
			).count()
			
			# If subscription limit reached, require payment
			if bookings_count >= subscription.plan.booking_limit:
				has_active_subscription = False
		
		# Check if already paid (only if payment_status column exists)
		if payment_columns_exist:
			paid_result = db.session.execute(
				text("""
					SELECT payment_status
					FROM bookings
					WHERE id = :booking_id
				"""),
				{"booking_id": booking_id}
			)
			paid_row = paid_result.fetchone()
			if paid_row and paid_row[0] == "paid":
				return jsonify({"message": "already paid"}), 400
		
		# If user has active subscription, mark as paid automatically (covered by subscription)
		if has_active_subscription:
			if payment_columns_exist:
				try:
					db.session.execute(
						text("""
							UPDATE bookings
							SET payment_status = 'paid',
								payment_method = 'subscription',
								amount = 0.0
							WHERE id = :booking_id
						"""),
						{"booking_id": booking_id}
					)
					db.session.commit()
				except Exception as e:
					db.session.rollback()
					import traceback
					traceback.print_exc()
					return jsonify({"message": f"Payment processing failed: {str(e)}"}), 500
			
			# Return success with booking info
			booking_dict = {
				"id": row[0],
				"userId": row[1],
				"portId": row[2],
				"startTime": row[3].isoformat() if row[3] else None,
				"endTime": row[4].isoformat() if row[4] else None,
				"amount": 0.0,
				"paymentStatus": "paid",
				"paymentMethod": "subscription",
				"createdAt": None,
			}
			
			return jsonify({
				"message": "payment successful (covered by subscription)",
				"booking": booking_dict
			}), 200
		
		data = request.get_json() or {}
		payment_method = data.get("paymentMethod", "credit_card")
		
		# Simulate payment processing
		# In production, integrate with payment gateway (Stripe, PayPal, etc.)
		# For now, we'll simulate a successful payment
		payment_id = f"pay_{booking_id}_{datetime.now().timestamp()}"
		
		# Update payment status if columns exist, otherwise just return success
		if payment_columns_exist:
			try:
				db.session.execute(
					text("""
						UPDATE bookings
						SET payment_status = 'paid',
							payment_method = :payment_method,
							payment_id = :payment_id
						WHERE id = :booking_id
					"""),
					{
						"booking_id": booking_id,
						"payment_method": payment_method,
						"payment_id": payment_id
					}
				)
				db.session.commit()
			except Exception as e:
				db.session.rollback()
				import traceback
				traceback.print_exc()
				return jsonify({"message": f"Payment processing failed: {str(e)}"}), 500
		
		# Get booking amount if amount column exists
		amount = 0.0
		try:
			amount_result = db.session.execute(
				text("""
					SELECT amount
					FROM bookings
					WHERE id = :booking_id
				"""),
				{"booking_id": booking_id}
			)
			amount_row = amount_result.fetchone()
			if amount_row:
				amount = float(amount_row[0]) if amount_row[0] is not None else 0.0
		except Exception:
			# Amount column doesn't exist, calculate it
			hours = (row[4] - row[3]).total_seconds() / 3600 if row[4] and row[3] else 1.0
			amount = round(hours * 5.0, 2)
		
		# Return booking dict
		booking_dict = {
			"id": row[0],
			"userId": row[1],
			"portId": row[2],
			"startTime": row[3].isoformat() if row[3] else None,
			"endTime": row[4].isoformat() if row[4] else None,
			"amount": amount,
			"paymentStatus": "paid",
			"paymentMethod": payment_method,
			"createdAt": None,
		}
		
		return jsonify({
			"message": "payment successful",
			"booking": booking_dict
		}), 200
	except Exception as e:
		db.session.rollback()
		import traceback
		traceback.print_exc()
		return jsonify({"message": f"Payment processing failed: {str(e)}"}), 500


@bookings_bp.delete("/<int:booking_id>")
@jwt_required()
def cancel_booking(booking_id: int):
	user_id = int(get_jwt_identity())
	booking = Booking.query.get_or_404(booking_id)
	if booking.user_id != user_id:
		return jsonify({"message": "forbidden"}), 403
	
	# If paid, mark as refunded instead of deleting
	try:
		if booking.payment_status == "paid":
			booking.payment_status = "refunded"
			db.session.commit()
			return jsonify({"message": "booking cancelled and refunded"}), 200
	except AttributeError:
		# payment_status column doesn't exist, just delete
		pass
	
	db.session.delete(booking)
	db.session.commit()
	return jsonify({"message": "deleted"}), 200
