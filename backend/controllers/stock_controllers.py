from flask import request, jsonify

from services.stock_service import StockService


class StockController:
    @staticmethod
    def _get_amount():
        data = request.get_json(force=True, silent=True) or {}
        amount = data.get("amount")

        if amount is None:
            return None, "Amount is required"

        try:
            amount = int(amount)
        except (TypeError, ValueError):
            return None, "Amount must be an integer"

        if amount <= 0:
            return None, "Amount must be greater than 0"

        return amount, None

    @staticmethod
    def increase_stock(product_id):
        amount, error = StockController._get_amount()
        if error:
            return jsonify({"error": error}), 400

        data = request.get_json(force=True, silent=True) or {}
        product, error = StockService.increase_stock(
            product_id, amount, data.get("reason")
        )
        if error:
            status = 404 if error == "Product not found" else 400
            return jsonify({"error": error}), status

        return jsonify(product.to_dict()), 200

    @staticmethod
    def decrease_stock(product_id):
        amount, error = StockController._get_amount()
        if error:
            return jsonify({"error": error}), 400

        data = request.get_json(force=True, silent=True) or {}
        product, error = StockService.decrease_stock(
            product_id, amount, data.get("reason")
        )
        if error:
            status = 404 if error == "Product not found" else 400
            return jsonify({"error": error}), status

        return jsonify(product.to_dict()), 200