from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from database.db import db
from models.product import Product


class ProductService:
    @staticmethod
    def _validate_price(price):
        if price is None:
            return None

        try:
            price = float(price)
        except (TypeError, ValueError):
            raise ValueError("Price must be a valid number")

        if price < 0:
            raise ValueError("Price cannot be negative")

        return price

    @staticmethod
    def _validate_stock_level(stock_level):
        if stock_level is None:
            return None

        try:
            stock_level = int(stock_level)
        except (TypeError, ValueError):
            raise ValueError("Stock level must be an integer")

        if stock_level < 0:
            raise ValueError("Stock level cannot be negative")

        return stock_level

    @staticmethod
    def create_product(data):
        price = ProductService._validate_price(data.get("price", 0.0))
        stock_level = ProductService._validate_stock_level(data.get("stock_level", 0))

        product = Product(
            name=data["name"],
            description=data.get("description"),
            price=price if price is not None else 0.0,
            stock_level=stock_level if stock_level is not None else 0,
        )
        try:
            db.session.add(product)
            db.session.commit()
            return product
        except IntegrityError:
            db.session.rollback()
            raise ValueError("Product name already exists")

    @staticmethod
    def get_product(product_id):
        return db.session.get(Product, product_id)

    @staticmethod
    def get_all_products():
        statement = select(Product).order_by(Product.id.asc())
        return db.session.scalars(statement).all()

    @staticmethod
    def update_product(product_id, data):
        product = db.session.get(Product, product_id)
        if not product:
            return None

        if "name" in data:
            product.name = data["name"]
        if "price" in data:
            product.price = ProductService._validate_price(data["price"])
        if "stock_level" in data:
            raise ValueError("Stock level cannot be edited through product update. Use the stock endpoints.")
        if "description" in data:
            product.description = data["description"]

        db.session.commit()
        return product

    @staticmethod
    def delete_product(product_id):
        product = db.session.get(Product, product_id)
        if not product:
            return False

        db.session.delete(product)
        db.session.commit()
        return True
