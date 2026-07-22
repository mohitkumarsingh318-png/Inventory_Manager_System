from flask import Flask

from database.db import db
from models.product import Product
from models.stock_log import StockLog
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


def test_stock_log_records_before_and_after_levels():
    app = create_test_app()

    with app.app_context():
        product = Product(name="Widget", price=10.0, stock_level=5)
        db.session.add(product)
        db.session.commit()

        StockService.increase_stock(product.id, 2, reason="restock")

        log = StockLog.query.order_by(StockLog.Sno.desc()).first()

        assert log is not None
        assert log.product_name == "Widget"
        assert log.stock_level_before == 5
        assert log.stock_level_after == 7
