from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import Favorite, EVPort


favorites_bp = Blueprint("favorites", __name__)


@favorites_bp.get("")
@jwt_required()
def list_my_favorites():
	user_id = int(get_jwt_identity())
	favorites = Favorite.query.filter_by(user_id=user_id).order_by(Favorite.created_at.desc()).all()
	ports = []
	for fav in favorites:
		port_dict = fav.port.to_dict(include_schedule=True) if fav.port else None
		if port_dict:
			ports.append(port_dict)
	return {"ports": ports}


@favorites_bp.post("/<int:port_id>")
@jwt_required()
def add_favorite(port_id: int):
	try:
		user_id = int(get_jwt_identity())
		port = EVPort.query.get_or_404(port_id)
		
		# Check if already favorited
		existing = Favorite.query.filter_by(user_id=user_id, port_id=port_id).first()
		if existing:
			return jsonify({"message": "already favorited", "favorite": existing.to_dict()}), 200
		
		favorite = Favorite(user_id=user_id, port_id=port_id)
		db.session.add(favorite)
		db.session.commit()
		return jsonify({"favorite": favorite.to_dict()}), 201
	except Exception as e:
		db.session.rollback()
		return jsonify({"message": str(e)}), 500


@favorites_bp.delete("/<int:port_id>")
@jwt_required()
def remove_favorite(port_id: int):
	try:
		user_id = int(get_jwt_identity())
		favorite = Favorite.query.filter_by(user_id=user_id, port_id=port_id).first_or_404()
		db.session.delete(favorite)
		db.session.commit()
		return jsonify({"message": "removed"}), 200
	except Exception as e:
		db.session.rollback()
		return jsonify({"message": str(e)}), 500


@favorites_bp.get("/check/<int:port_id>")
@jwt_required()
def check_favorite(port_id: int):
	user_id = int(get_jwt_identity())
	favorite = Favorite.query.filter_by(user_id=user_id, port_id=port_id).first()
	return {"isFavorite": favorite is not None}, 200
