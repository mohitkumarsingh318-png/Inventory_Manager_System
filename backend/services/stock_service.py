from database.db import db
from models.product import Product
from models.stock_log import StockLog
from sqlalchemy.exc import SQLAlchemyError


class StockService:
    @staticmethod
    def _create_stock_log(product, stock_level_before, change, reason=None):
        log = StockLog(
            product_id=product.id,
            product_name=product.name,
            change=change,
            stock_level_before=stock_level_before,
            stock_level_after=product.stock_level,
            reason=reason,
        )
        db.session.add(log)

    @staticmethod
    def adjust_stock(product_id, amount, reason=None):
        product = Product.query.with_for_update().filter_by(id=product_id).first()
        if not product:
            return None, "Product not found"

        stock_level_before = product.stock_level
        new_stock = stock_level_before + amount
        if new_stock < 0:
            return None, "Insufficient stock"

        product.stock_level = new_stock
        StockService._create_stock_log(product, stock_level_before, amount, reason)
        db.session.commit()
        return product, None

    @staticmethod
    def increase_stock(product_id, amount, reason=None):
        try:
            product = (
                db.session.query(Product)
                .with_for_update()
                .filter_by(id=product_id)
                .first()
            )
            if not product:
                return None, "Product not found"

            stock_level_before = product.stock_level
            product.stock_level += int(amount)
            db.session.add(product)
            StockService._create_stock_log(product, stock_level_before, int(amount), reason)
            db.session.commit()

            return product, None
        except SQLAlchemyError as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def decrease_stock(product_id, amount, reason=None):
        try:
            product = (
                db.session.query(Product)
                .with_for_update()
                .filter_by(id=product_id)
                .first()
            )
            if not product:
                return None, "Product not found"

            amount = int(amount)
            stock_level_before = product.stock_level
            if stock_level_before < amount:
                return None, "Insufficient stock"

            product.stock_level -= amount
            db.session.add(product)
            StockService._create_stock_log(product, stock_level_before, -amount, reason)
            db.session.commit()

            return product, None
        except SQLAlchemyError as e:
            db.session.rollback()
            return None, str(e)
    @staticmethod
    def get_stock_history(product_id, limit=100):
        logs = (
            StockLog.query.filter_by(product_id=product_id)
            .order_by(StockLog.created_at.desc())
            .limit(limit)
            .all()
        )
        return logs
