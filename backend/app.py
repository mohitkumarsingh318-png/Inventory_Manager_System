from flask import Flask, jsonify
from sqlalchemy import text

from config import Config
from database.db import db

from routes.product_routes import product_bp
from routes.stock_routes import stock_bp

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "message": "Inventory Manager API",
        "endpoints": [
            "/products/",
            "/products/<id>",
            "/stock/increase/<id>",
            "/stock/decrease/<id>"
        ]
    }), 200

app.register_blueprint(product_bp)
app.register_blueprint(stock_bp)

with app.app_context():
    db.create_all()

    inspector = db.inspect(db.engine)
    stock_log_columns = {column["name"] for column in inspector.get_columns("stock_logs")}

    if "product_name" not in stock_log_columns:
        db.session.execute(text("ALTER TABLE stock_logs ADD COLUMN product_name VARCHAR(128) NOT NULL DEFAULT ''"))
    if "stock_level_before" not in stock_log_columns:
        db.session.execute(text("ALTER TABLE stock_logs ADD COLUMN stock_level_before INTEGER NOT NULL DEFAULT 0"))
    if "stock_level_after" not in stock_log_columns:
        db.session.execute(text("ALTER TABLE stock_logs ADD COLUMN stock_level_after INTEGER NOT NULL DEFAULT 0"))

    db.session.commit()

if __name__ == "__main__":
    app.run(host="127.0.0.1",port=5000,debug=True,threaded= True)