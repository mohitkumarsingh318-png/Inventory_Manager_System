from flask import Flask

from database.db import db
from models.product import Product
from models.stock_log import StockLog
from services.product_service import ProductService
from services.stock_service import StockService


def create_test_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["TESTING"] = True

    db.init_app(app)

    with app.app_context():
        db.create_all()

    return app


def test_create_product_rejects_negative_price():
    app = create_test_app()

    with app.app_context():
        try:
            ProductService.create_product({"name": "BadPrice", "price": -1.0})
            assert False, "Expected ValueError for negative price"
        except ValueError as exc:
            assert "Price cannot be negative" in str(exc)


def test_create_product_rejects_negative_stock():
    app = create_test_app()

    with app.app_context():
        try:
            ProductService.create_product({"name": "BadStock", "stock_level": -5})
            assert False, "Expected ValueError for negative stock"
        except ValueError as exc:
            assert "Stock level cannot be negative" in str(exc)


def test_update_product_blocks_stock_level_changes():
    app = create_test_app()

    with app.app_context():
        product = Product(name="Widget", price=5.0, stock_level=10)
        db.session.add(product)
        db.session.commit()

        try:
            ProductService.update_product(product.id, {"stock_level": 20})
            assert False, "Expected ValueError for stock level updates via product endpoint"
        except ValueError as exc:
            assert "Stock level cannot be edited" in str(exc)


def test_delete_product_removes_stock_logs():
    app = create_test_app()

    with app.app_context():
        product = Product(name="Widget", price=10.0, stock_level=5)
        db.session.add(product)
        db.session.commit()

        StockService.increase_stock(product.id, 2, reason="restock")
        assert StockLog.query.filter_by(product_id=product.id).count() == 1

        ProductService.delete_product(product.id)

        assert db.session.get(Product, product.id) is None
        assert StockLog.query.filter_by(product_id=product.id).count() == 0
