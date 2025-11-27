from datetime import datetime, timedelta, time as dt_time
from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from sqlalchemy import text
from ..models import EVPort, Booking
from ..extensions import db


ports_bp = Blueprint("ports", __name__)


@ports_bp.get("")
def list_ports():
	query = EVPort.query
	city = request.args.get("city")
	if city:
		query = query.filter(EVPort.city.ilike(f"%{city}%"))
	ports = [p.to_dict() for p in query.all()]
	return {"ports": ports}


@ports_bp.get("/<int:port_id>")
def get_port(port_id: int):
	port = EVPort.query.get_or_404(port_id)
	return {"port": port.to_dict(include_schedule=True)}


@ports_bp.get("/<int:port_id>/available-slots")
def get_available_slots(port_id: int):
	"""Get all 1-hour time slots for a port for the next 7 days with availability status"""
	try:
		port = EVPort.query.get_or_404(port_id)
		
		# Get date range (today + next 7 days)
		now = datetime.now()
		start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
		end_date = start_date + timedelta(days=7)
		
		# Get existing bookings for this port
		# Try to filter by payment_status if column exists, otherwise get all bookings
		try:
			# First try to get all bookings without payment filter to test if columns exist
			test_query = Booking.query.filter(
				Booking.port_id == port_id,
				Booking.start_time >= start_date,
				Booking.start_time < end_date
			).first()
			
			# If we can access payment_status, filter by it
			if test_query and hasattr(test_query, 'payment_status'):
				existing_bookings = Booking.query.filter(
					Booking.port_id == port_id,
					Booking.start_time >= start_date,
					Booking.start_time < end_date,
					Booking.payment_status == "paid"
				).all()
			else:
				# Payment columns don't exist, get all bookings
				existing_bookings = Booking.query.filter(
					Booking.port_id == port_id,
					Booking.start_time >= start_date,
					Booking.start_time < end_date
				).all()
		except Exception as e:
			# If query fails due to missing columns, use raw SQL or skip payment filter
			from sqlalchemy import text
			try:
				# Use raw SQL to get only the columns that exist
				result = db.session.execute(
					text("""
						SELECT start_time, end_time 
						FROM bookings 
						WHERE port_id = :port_id 
						AND start_time >= :start_date 
						AND start_time < :end_date
					"""),
					{"port_id": port_id, "start_date": start_date, "end_date": end_date}
				)
				existing_bookings = [
					type('Booking', (), {'start_time': row[0], 'end_time': row[1]})()
					for row in result
				]
			except Exception:
				# If even raw SQL fails, return empty list
				existing_bookings = []
		
		# Convert bookings to time ranges for easier checking
		booked_ranges = [(b.start_time, b.end_time) for b in existing_bookings]
		
		# Get port schedule
		schedules = {s.weekday: (s.open_time, s.close_time) for s in port.schedules}
		
		all_slots = []
		current_date = start_date
		
		while current_date < end_date:
			weekday = current_date.weekday()  # 0=Monday, 6=Sunday
			
			if weekday in schedules:
				open_time, close_time = schedules[weekday]
				
				# Create datetime objects for today's open/close times
				day_open = current_date.replace(hour=open_time.hour, minute=open_time.minute)
				day_close = current_date.replace(hour=close_time.hour, minute=close_time.minute)
				
				# If today, start from current time if it's later than open time
				if current_date.date() == now.date() and now > day_open:
					day_open = now
					# Round up to next hour
					if day_open.minute > 0 or day_open.second > 0:
						day_open = day_open.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
				
				# Generate 1-hour slots
				slot_start = day_open
				while slot_start + timedelta(hours=1) <= day_close:
					slot_end = slot_start + timedelta(hours=1)
					
					# Check if this slot conflicts with any booking
					is_available = True
					for booked_start, booked_end in booked_ranges:
						if slot_start < booked_end and slot_end > booked_start:
							is_available = False
							break
					
					# Check if slot is in the past
					is_past = slot_start < now
					
					all_slots.append({
						"startTime": slot_start.isoformat(),
						"endTime": slot_end.isoformat(),
						"available": is_available and not is_past,
						"past": is_past,
					})
					
					slot_start += timedelta(hours=1)
			
			current_date += timedelta(days=1)
		
		return {"slots": all_slots}
	except Exception as e:
		import traceback
		traceback.print_exc()
		return {"message": f"Error loading slots: {str(e)}", "slots": []}, 500
