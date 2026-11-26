import re

from flask import current_app, jsonify, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from database.db import db
from models.user import User


EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def create_token(user_id):
    serializer = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])
    return serializer.dumps({"user_id": user_id}, salt="inventory-auth")


def get_current_user():
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        return None

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        return None

    serializer = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])
    try:
        payload = serializer.loads(
            token,
            salt="inventory-auth",
            max_age=current_app.config["AUTH_TOKEN_MAX_AGE"],
        )
    except (BadSignature, SignatureExpired):
        return None

    return db.session.get(User, payload.get("user_id"))


class AuthController:
    @staticmethod
    def signup():
        data = request.get_json(force=True, silent=True)
        if not isinstance(data, dict):
            return jsonify({"error": "Valid account details are required"}), 400

        name = str(data.get("name", "")).strip()
        email = str(data.get("email", "")).strip().lower()
        password = str(data.get("password", ""))

        if not name:
            return jsonify({"error": "Full name is required"}), 400
        if not EMAIL_PATTERN.match(email):
            return jsonify({"error": "Enter a valid email address"}), 400
        if len(password) < 8:
            return jsonify({"error": "Password must be at least 8 characters"}), 400
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "An account with this email already exists"}), 409

        user = User(name=name, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        return jsonify({"token": create_token(user.id), "user": user.to_dict()}), 201

    @staticmethod
    def signin():
        data = request.get_json(force=True, silent=True)
        if not isinstance(data, dict):
            return jsonify({"error": "Valid sign-in details are required"}), 400

        email = str(data.get("email", "")).strip().lower()
        password = str(data.get("password", ""))
        user = User.query.filter_by(email=email).first()

        if not user or not user.check_password(password):
            return jsonify({"error": "Invalid email or password"}), 401

        return jsonify({"token": create_token(user.id), "user": user.to_dict()}), 200

    @staticmethod
    def me():
        user = get_current_user()
        if not user:
            return jsonify({"error": "Authentication required"}), 401
        return jsonify({"user": user.to_dict()}), 200
