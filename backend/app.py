import os

from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import text

from config import Config
from database.db import db

from routes.product_routes import product_bp
from routes.stock_routes import stock_bp

app = Flask(__name__)
app.config.from_object(Config)
CORS(app, resources={r"/*": {"origins": app.config["CORS_ORIGINS"]}})

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

    if "id" in stock_log_columns and "Sno" not in stock_log_columns:
        engine_name = db.engine.url.get_backend_name()
        if engine_name == "mysql":
            db.session.execute(text(
                "ALTER TABLE stock_logs CHANGE COLUMN id Sno INT NOT NULL AUTO_INCREMENT"
            ))
        else:
            db.session.execute(text("ALTER TABLE stock_logs RENAME COLUMN id TO Sno"))
        stock_log_columns.remove("id")
        stock_log_columns.add("Sno")

    if "product_name" not in stock_log_columns:
        db.session.execute(text("ALTER TABLE stock_logs ADD COLUMN product_name VARCHAR(128) NOT NULL DEFAULT ''"))
    if "stock_level_before" not in stock_log_columns:
        db.session.execute(text("ALTER TABLE stock_logs ADD COLUMN stock_level_before INTEGER NOT NULL DEFAULT 0"))
    if "stock_level_after" not in stock_log_columns:
        db.session.execute(text("ALTER TABLE stock_logs ADD COLUMN stock_level_after INTEGER NOT NULL DEFAULT 0"))

    db.session.commit()

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
        threaded=True,
    )