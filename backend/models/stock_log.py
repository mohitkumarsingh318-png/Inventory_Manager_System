from datetime import datetime

from database.db import db


class StockLog(db.Model):
    __tablename__ = "stock_logs"

    Sno = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    product_name = db.Column(db.String(128), nullable=False)
    change = db.Column(db.Integer, nullable=False)
    stock_level_before = db.Column(db.Integer, nullable=False, default=0)
    stock_level_after = db.Column(db.Integer, nullable=False, default=0)
    reason = db.Column(db.String(256), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    product = db.relationship(
        "Product",
        backref=db.backref("stock_logs", lazy=True, cascade="all, delete-orphan"),
        passive_deletes=True,
    )

    def to_dict(self):
        return {
            "Sno": self.Sno,
            "product_id": self.product_id,
            "product_name": self.product_name,
            "change": self.change,
            "stock_level_before": self.stock_level_before,
            "stock_level_after": self.stock_level_after,
            "reason": self.reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
