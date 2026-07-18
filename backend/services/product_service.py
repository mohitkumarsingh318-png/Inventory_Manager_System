from sqlalchemy.exc import IntegrityError

from database.db import db
from models.product import Product


class ProductService:
    @staticmethod
    def create_product(data):
        product = Product(
            name=data["name"],
            description=data.get("description"),
            price=data.get("price", 0.0),
            stock_level=data.get("stock_level", 0),
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
        return Product.query.get(product_id)

    @staticmethod
    def get_all_products():
        return Product.query.order_by(Product.id.asc()).all()

   
    @staticmethod
    def update_product(product_id, data):
        product = Product.query.get(product_id)
        if not product:
            return None

        if "name" in data:
            product.name = data["name"]
        if "price" in data:
            product.price = data["price"]
        if "stock_level" in data:
            product.stock_level = data["stock_level"]
        if "description" in data:
            product.description = data["description"]

        db.session.commit()
        return product

    @staticmethod
    def delete_product(product_id):
        product = Product.query.get(product_id)
        if not product:
            return False

        db.session.delete(product)
        db.session.commit()
        return True
