from flask import Blueprint

from controllers.auth_controller import AuthController


auth_bp = Blueprint("auth_bp", __name__, url_prefix="/auth")

auth_bp.route("/signup", methods=["POST"])(AuthController.signup)
auth_bp.route("/signin", methods=["POST"])(AuthController.signin)
auth_bp.route("/me", methods=["GET"])(AuthController.me)
