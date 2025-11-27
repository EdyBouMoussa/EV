from flask import Flask
from flask_cors import CORS
from .extensions import db, migrate, jwt
from .config import Config


def create_app(config_object: type[Config] | None = None) -> Flask:
	app = Flask(__name__)
	app.config.from_object(config_object or Config)

	# CORS for local dev (React on 5173/3000)
	CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"]}}, supports_credentials=True)

	# Init extensions
	db.init_app(app)
	migrate.init_app(app, db)
	jwt.init_app(app)

	# Register blueprints
	from .routes.auth import auth_bp
	from .routes.ports import ports_bp
	from .routes.bookings import bookings_bp
	from .routes.favorites import favorites_bp
	from .routes.subscriptions import subscriptions_bp
	from .routes.admin import admin_bp

	app.register_blueprint(auth_bp, url_prefix="/api/auth")
	app.register_blueprint(ports_bp, url_prefix="/api/ports")
	app.register_blueprint(bookings_bp, url_prefix="/api/bookings")
	app.register_blueprint(favorites_bp, url_prefix="/api/favorites")
	app.register_blueprint(subscriptions_bp, url_prefix="/api/subscriptions")
	app.register_blueprint(admin_bp, url_prefix="/api/admin")

	# Serve uploaded images
	@app.route("/api/uploads/<filename>")
	def uploaded_file(filename):
		from flask import send_from_directory
		import os
		upload_folder = os.path.join(app.instance_path, 'uploads')
		return send_from_directory(upload_folder, filename)

	@app.get("/api/health")
	def health() -> dict:
		return {"status": "ok"}

	return app


if __name__ == "__main__":
	app = create_app()
	app.run(host="0.0.0.0", port=5000, debug=True)



