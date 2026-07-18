from flask import Flask, jsonify
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

if __name__ == "__main__":
    app.run(host="127.0.0.1",port=5000,debug=True,threaded= True)