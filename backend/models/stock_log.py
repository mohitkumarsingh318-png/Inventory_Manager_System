from datetime import datetime

from database.db import db


class StockLog(db.Model):
    __tablename__ = "stock_logs"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    change = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.String(256), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    product = db.relationship("Product", backref=db.backref("stock_logs", lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "change": self.change,
            "reason": self.reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
