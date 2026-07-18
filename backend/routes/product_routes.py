from flask import Blueprint

from controllers.product_controller import ProductController

product_bp = Blueprint("product_bp", __name__, url_prefix="/products")

product_bp.route("/", methods=["POST"])(ProductController.create_product)
product_bp.route("/", methods=["GET"])(ProductController.get_products)
product_bp.route("/<int:product_id>", methods=["GET"])(ProductController.get_product)
product_bp.route("/<int:product_id>", methods=["PUT"])(ProductController.update_product)
product_bp.route("/<int:product_id>", methods=["DELETE"])(ProductController.delete_product)
product_bp.route("/<int:product_id>/stock-history", methods=["GET"])(ProductController.get_stock_history)



