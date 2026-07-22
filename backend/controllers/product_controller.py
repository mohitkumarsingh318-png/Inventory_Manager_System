from flask import request, jsonify

from services.product_service import ProductService


class ProductController:
    @staticmethod
    def create_product():
        data = request.get_json() or {}
        if not data.get("name"):
            return jsonify({"error": "Product name is required"}), 400

        try:
            product = ProductService.create_product(data)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        return jsonify(product.to_dict()), 201

    @staticmethod
    def get_products():
        products = ProductService.get_all_products()
        return jsonify([product.to_dict() for product in products]), 200

    @staticmethod
    def get_product(product_id):
        product = ProductService.get_product(product_id)
        if not product:
            return jsonify({"error": "Product not found"}), 404
        return jsonify(product.to_dict()), 200

    @staticmethod
    def update_product(product_id):
        data = request.get_json(force=True, silent=True) or {}
        if not data:
            return jsonify({"error": "No update data provided"}), 400

        try:
            product = ProductService.update_product(product_id, data)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        if not product:
            return jsonify({"error": "Product not found"}), 404

        return jsonify(product.to_dict()), 200

    @staticmethod
    def delete_product(product_id):
        deleted = ProductService.delete_product(product_id)
        if not deleted:
            return jsonify({"error": "Product not found"}), 404
        return jsonify({"message": "Product deleted"}), 200

    @staticmethod
    def get_stock_history(product_id):
        from services.stock_service import StockService

        logs = StockService.get_stock_history(product_id)
        if logs is None:
            return jsonify({"error": "Product not found"}), 404
        return jsonify([log.to_dict() for log in logs]), 200
    
    