from flask import Blueprint

from controllers.stock_controllers import StockController

stock_bp = Blueprint("stock_bp", __name__, url_prefix="/stock")

stock_bp.route("/increase/<int:product_id>", methods=["POST"])(StockController.increase_stock)
stock_bp.route("/decrease/<int:product_id>", methods=["POST"])(StockController.decrease_stock)
