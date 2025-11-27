import os


class Config:
	SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
	SQLALCHEMY_DATABASE_URI = os.getenv(
		"DATABASE_URL",
		"mysql+pymysql://ev_user:ev_password@127.0.0.1:3306/ev_db",
	)
	SQLALCHEMY_TRACK_MODIFICATIONS = False
	JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
	JWT_TOKEN_LOCATION = ["headers"]





