from flask import Flask

from controllers.auth_controller import get_current_user
from database.db import db
from models.user import User
from routes.auth_routes import auth_bp


def create_test_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["TESTING"] = True
    app.config["SECRET_KEY"] = "test-secret"
    app.config["AUTH_TOKEN_MAX_AGE"] = 3600

    db.init_app(app)
    app.register_blueprint(auth_bp)

    with app.app_context():
        db.create_all()

    return app


def test_signup_signin_and_authenticated_profile():
    app = create_test_app()
    client = app.test_client()

    signup = client.post("/auth/signup", json={
        "name": "Alex Morgan",
        "email": "alex@example.com",
        "password": "strongpass123",
    })
    assert signup.status_code == 201
    token = signup.get_json()["token"]

    profile = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert profile.status_code == 200
    assert profile.get_json()["user"]["email"] == "alex@example.com"

    signin = client.post("/auth/signin", json={
        "email": "alex@example.com",
        "password": "strongpass123",
    })
    assert signin.status_code == 200


def test_signup_rejects_duplicate_email():
    app = create_test_app()
    client = app.test_client()
    payload = {"name": "Alex", "email": "alex@example.com", "password": "strongpass123"}

    assert client.post("/auth/signup", json=payload).status_code == 201
    duplicate = client.post("/auth/signup", json=payload)
    assert duplicate.status_code == 409
    assert "already exists" in duplicate.get_json()["error"]
