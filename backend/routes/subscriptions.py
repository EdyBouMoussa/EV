from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import text
from ..extensions import db
from ..models import SubscriptionPlan, UserSubscription, Booking

subscriptions_bp = Blueprint("subscriptions", __name__)


@subscriptions_bp.get("/plans")
def list_plans():
	"""Get all available subscription plans"""
	try:
		plans = SubscriptionPlan.query.filter_by(is_active=True).order_by(SubscriptionPlan.price.asc()).all()
		return jsonify({"plans": [p.to_dict() for p in plans]})
	except Exception as e:
		import traceback
		traceback.print_exc()
		return jsonify({"message": f"Failed to load plans: {str(e)}", "plans": []}), 500


@subscriptions_bp.get("")
@jwt_required()
def list_my_subscriptions():
	"""Get current user's subscriptions"""
	try:
		user_id = int(get_jwt_identity())
		subscriptions = UserSubscription.query.filter_by(user_id=user_id, is_active=True).order_by(UserSubscription.start_date.desc()).all()
		
		# Calculate usage for each subscription
		result = []
		for sub in subscriptions:
			sub_dict = sub.to_dict()
			
			# Count bookings used in current period
			bookings_count = Booking.query.filter(
				Booking.user_id == user_id,
				Booking.start_time >= sub.start_date,
				Booking.start_time < sub.end_date,
				Booking.payment_status == "paid"
			).count()
			
			sub_dict["bookingsUsed"] = bookings_count
			sub_dict["bookingsRemaining"] = max(0, sub.plan.booking_limit - bookings_count)
			result.append(sub_dict)
		
		return jsonify({"subscriptions": result})
	except Exception as e:
		import traceback
		traceback.print_exc()
		return jsonify({"message": f"Failed to load subscriptions: {str(e)}", "subscriptions": []}), 500


@subscriptions_bp.post("/subscribe")
@jwt_required()
def subscribe():
	"""Subscribe to a plan"""
	try:
		user_id = int(get_jwt_identity())
		data = request.get_json() or {}
		plan_id = data.get("planId")
		
		if not plan_id:
			return jsonify({"message": "planId is required"}), 400
		
		plan = SubscriptionPlan.query.get_or_404(plan_id)
		
		if not plan.is_active:
			return jsonify({"message": "Plan is not available"}), 400
		
		# Calculate end date based on plan type
		start_date = datetime.utcnow()
		if plan.plan_type == "weekly":
			end_date = start_date + timedelta(weeks=1)
		elif plan.plan_type == "monthly":
			end_date = start_date + timedelta(days=30)
		else:
			return jsonify({"message": "Invalid plan type"}), 400
		
		# Deactivate any existing active subscriptions
		existing = UserSubscription.query.filter_by(user_id=user_id, is_active=True).all()
		for sub in existing:
			sub.is_active = False
		
		# Create new subscription
		subscription = UserSubscription(
			user_id=user_id,
			plan_id=plan.id,
			start_date=start_date,
			end_date=end_date,
			is_active=True
		)
		db.session.add(subscription)
		db.session.commit()
		
		return jsonify({
			"message": "Subscription activated successfully",
			"subscription": subscription.to_dict()
		}), 201
	except Exception as e:
		db.session.rollback()
		import traceback
		traceback.print_exc()
		return jsonify({"message": f"Failed to subscribe: {str(e)}"}), 500


@subscriptions_bp.get("/check-limit")
@jwt_required()
def check_booking_limit():
	"""Check if user can make a booking based on subscription"""
	try:
		user_id = int(get_jwt_identity())
		
		# Get active subscription
		subscription = UserSubscription.query.filter_by(user_id=user_id, is_active=True).first()
		
		if not subscription:
			return jsonify({
				"hasSubscription": False,
				"canBook": False,
				"message": "No active subscription"
			})
		
		# Check if subscription is still valid
		if datetime.utcnow() > subscription.end_date:
			return jsonify({
				"hasSubscription": True,
				"canBook": False,
				"message": "Subscription has expired"
			})
		
		# Count bookings used in current period
		bookings_count = Booking.query.filter(
			Booking.user_id == user_id,
			Booking.start_time >= subscription.start_date,
			Booking.start_time < subscription.end_date,
			Booking.payment_status == "paid"
		).count()
		
		can_book = bookings_count < subscription.plan.booking_limit
		
		return jsonify({
			"hasSubscription": True,
			"canBook": can_book,
			"bookingsUsed": bookings_count,
			"bookingLimit": subscription.plan.booking_limit,
			"bookingsRemaining": max(0, subscription.plan.booking_limit - bookings_count),
			"message": "Limit reached" if not can_book else "Can book"
		})
	except Exception as e:
		import traceback
		traceback.print_exc()
		return jsonify({"message": f"Failed to check limit: {str(e)}"}), 500

