from database.db import db
from models.product import Product
from models.stock_log import StockLog
from sqlalchemy.exc import SQLAlchemyError


class StockService:
    @staticmethod
    def adjust_stock(product_id, amount, reason=None):
        product = Product.query.with_for_update().filter_by(id=product_id).first()
        if not product:
            return None, "Product not found"

        new_stock = product.stock_level + amount
        if new_stock < 0:
            return None, "Insufficient stock"

        product.stock_level = new_stock
        log = StockLog(product_id=product.id, change=amount, reason=reason)
        db.session.add(log)
        db.session.commit()
        return product, None

    @staticmethod
    def increase_stock(product_id, amount, reason=None):
        try:
            with db.session.begin():
                product = (
                    db.session.query(Product)
                    .with_for_update()
                    .filter_by(id=product_id)
                    .first()
                )
                if not product:
                    return None, "Product not found"

                product.stock_level += int(amount)
                db.session.add(product)

            return product, None
        except SQLAlchemyError as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def decrease_stock(product_id, amount, reason=None):
        try:
            with db.session.begin():
                product = (
                    db.session.query(Product)
                    .with_for_update()
                    .filter_by(id=product_id)
                    .first()
                )
                if not product:
                    return None, "Product not found"

                amount = int(amount)
                if product.stock_level < amount:
                    return None, "Insufficient stock"

                product.stock_level -= amount
                db.session.add(product)

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
