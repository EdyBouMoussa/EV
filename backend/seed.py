from datetime import time
from .app import create_app
from .extensions import db
from .models import EVPort, EVPortSchedule


def seed_ports():
	ports = [
		EVPort(name="Beirut Downtown Charger", city="Beirut", address="Martyrs' Square",
			latitude=33.8983, longitude=35.5097, connector_type="Type2", power_kw=22.0),
		EVPort(name="Jounieh Marina Charger", city="Jounieh", address="Marina",
			latitude=33.9819, longitude=35.6172, connector_type="CCS", power_kw=50.0),
		EVPort(name="Tripoli Station", city="Tripoli", address="Central Station",
			latitude=34.4367, longitude=35.8346, connector_type="CHAdeMO", power_kw=50.0),
	]
	for p in ports:
		db.session.add(p)
		for weekday in range(7):
			db.session.add(EVPortSchedule(port=p, weekday=weekday, open_time=time(8, 0), close_time=time(22, 0)))
	db.session.commit()


if __name__ == "__main__":
	app = create_app()
	with app.app_context():
		db.create_all()
		if EVPort.query.count() == 0:
			seed_ports()
			print("Seeded EV ports")
		else:
			print("EV ports already seeded")






