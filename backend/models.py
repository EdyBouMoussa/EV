from datetime import time, datetime
from sqlalchemy import UniqueConstraint
from .extensions import db


class User(db.Model):
	__tablename__ = "users"
	id = db.Column(db.Integer, primary_key=True)
	full_name = db.Column(db.String(120))
	email = db.Column(db.String(255), unique=True, nullable=False, index=True)
	password_hash = db.Column(db.String(255), nullable=False)
	is_admin = db.Column(db.Boolean, default=False, nullable=False)
	bookings = db.relationship("Booking", backref="user", lazy=True)
	favorites = db.relationship("Favorite", backref="user", lazy=True, cascade="all, delete-orphan")
	subscriptions = db.relationship("UserSubscription", backref="user", lazy=True, cascade="all, delete-orphan")

	def to_dict(self) -> dict:
		return {"id": self.id, "fullName": self.full_name, "email": self.email, "isAdmin": self.is_admin}


class EVPort(db.Model):
	__tablename__ = "ev_ports"
	id = db.Column(db.Integer, primary_key=True)
	name = db.Column(db.String(200), nullable=False)
	city = db.Column(db.String(120), nullable=False)
	address = db.Column(db.String(255))
	latitude = db.Column(db.Float, nullable=False)
	longitude = db.Column(db.Float, nullable=False)
	connector_type = db.Column(db.String(80))
	power_kw = db.Column(db.Float)
	image_url = db.Column(db.String(500))  # URL or path to port image
	is_active = db.Column(db.Boolean, default=True)
	schedules = db.relationship("EVPortSchedule", backref="port", lazy=True, cascade="all, delete-orphan")
	bookings = db.relationship("Booking", backref="port", lazy=True, cascade="all, delete-orphan")
	favorites = db.relationship("Favorite", backref="port", lazy=True, cascade="all, delete-orphan")

	def to_dict(self, include_schedule: bool = False) -> dict:
		data = {
			"id": self.id,
			"name": self.name,
			"city": self.city,
			"address": self.address,
			"latitude": self.latitude,
			"longitude": self.longitude,
			"connectorType": self.connector_type,
			"powerKw": self.power_kw,
			"imageUrl": self.image_url,
			"isActive": self.is_active,
		}
		if include_schedule:
			data["schedules"] = [s.to_dict() for s in self.schedules]
		return data


class EVPortSchedule(db.Model):
	__tablename__ = "ev_port_schedules"
	id = db.Column(db.Integer, primary_key=True)
	port_id = db.Column(db.Integer, db.ForeignKey("ev_ports.id"), nullable=False)
	weekday = db.Column(db.Integer, nullable=False)  # 0=Mon .. 6=Sun
	open_time = db.Column(db.Time, nullable=False)
	close_time = db.Column(db.Time, nullable=False)
	__table_args__ = (UniqueConstraint("port_id", "weekday", name="uq_port_weekday"),)

	def to_dict(self) -> dict:
		def fmt(t: time) -> str:
			return t.strftime("%H:%M")
		return {"weekday": self.weekday, "open": fmt(self.open_time), "close": fmt(self.close_time)}


class Booking(db.Model):
	__tablename__ = "bookings"
	id = db.Column(db.Integer, primary_key=True)
	user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
	port_id = db.Column(db.Integer, db.ForeignKey("ev_ports.id"), nullable=False)
	start_time = db.Column(db.DateTime, nullable=False, index=True)
	end_time = db.Column(db.DateTime, nullable=False, index=True)
	amount = db.Column(db.Float, nullable=False, default=0.0)
	payment_status = db.Column(db.String(20), nullable=False, default="pending")  # pending, paid, failed, refunded
	payment_method = db.Column(db.String(50))  # credit_card, debit_card, etc.
	payment_id = db.Column(db.String(100))  # External payment transaction ID
	created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

	def to_dict(self) -> dict:
		result = {
			"id": self.id,
			"userId": self.user_id,
			"portId": self.port_id,
			"startTime": self.start_time.isoformat(),
			"endTime": self.end_time.isoformat(),
		}
		# Add payment fields only if they exist in the database
		try:
			result["amount"] = self.amount
		except AttributeError:
			result["amount"] = 0.0
		try:
			result["paymentStatus"] = self.payment_status
		except AttributeError:
			result["paymentStatus"] = "pending"
		try:
			result["paymentMethod"] = self.payment_method
		except AttributeError:
			result["paymentMethod"] = None
		try:
			result["createdAt"] = self.created_at.isoformat() if self.created_at else None
		except AttributeError:
			result["createdAt"] = None
		return result


class Favorite(db.Model):
	__tablename__ = "favorites"
	id = db.Column(db.Integer, primary_key=True)
	user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
	port_id = db.Column(db.Integer, db.ForeignKey("ev_ports.id"), nullable=False, index=True)
	created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
	__table_args__ = (UniqueConstraint("user_id", "port_id", name="uq_user_port_favorite"),)

	def to_dict(self) -> dict:
		return {
			"id": self.id,
			"userId": self.user_id,
			"portId": self.port_id,
			"createdAt": self.created_at.isoformat(),
		}


class SubscriptionPlan(db.Model):
	__tablename__ = "subscription_plans"
	id = db.Column(db.Integer, primary_key=True)
	name = db.Column(db.String(100), nullable=False)  # e.g., "Weekly Basic", "Monthly Premium"
	plan_type = db.Column(db.String(20), nullable=False)  # "weekly" or "monthly"
	booking_limit = db.Column(db.Integer, nullable=False)  # Number of bookings allowed
	price = db.Column(db.Float, nullable=False)  # Price in dollars
	is_active = db.Column(db.Boolean, default=True)
	created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

	def to_dict(self) -> dict:
		return {
			"id": self.id,
			"name": self.name,
			"planType": self.plan_type,
			"bookingLimit": self.booking_limit,
			"price": self.price,
			"isActive": self.is_active,
		}


class UserSubscription(db.Model):
	__tablename__ = "user_subscriptions"
	id = db.Column(db.Integer, primary_key=True)
	user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
	plan_id = db.Column(db.Integer, db.ForeignKey("subscription_plans.id"), nullable=False)
	start_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
	end_date = db.Column(db.DateTime, nullable=False)  # Calculated based on plan type
	is_active = db.Column(db.Boolean, default=True)
	created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
	plan = db.relationship("SubscriptionPlan", backref="subscriptions", lazy=True)

	def to_dict(self) -> dict:
		return {
			"id": self.id,
			"userId": self.user_id,
			"planId": self.plan_id,
			"plan": self.plan.to_dict() if self.plan else None,
			"startDate": self.start_date.isoformat(),
			"endDate": self.end_date.isoformat(),
			"isActive": self.is_active,
			"createdAt": self.created_at.isoformat(),
		}





