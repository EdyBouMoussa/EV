"""Seed subscription plans"""
from .app import create_app
from .extensions import db
from .models import SubscriptionPlan


def seed_plans():
	plans = [
		SubscriptionPlan(
			name="Weekly Basic",
			plan_type="weekly",
			booking_limit=5,
			price=9.99,
			is_active=True
		),
		SubscriptionPlan(
			name="Weekly Premium",
			plan_type="weekly",
			booking_limit=15,
			price=19.99,
			is_active=True
		),
		SubscriptionPlan(
			name="Monthly Basic",
			plan_type="monthly",
			booking_limit=20,
			price=29.99,
			is_active=True
		),
		SubscriptionPlan(
			name="Monthly Premium",
			plan_type="monthly",
			booking_limit=60,
			price=49.99,
			is_active=True
		),
	]
	for p in plans:
		db.session.add(p)
	db.session.commit()


if __name__ == "__main__":
	app = create_app()
	with app.app_context():
		db.create_all()
		if SubscriptionPlan.query.count() == 0:
			seed_plans()
			print("Seeded subscription plans")
		else:
			print("Subscription plans already seeded")

