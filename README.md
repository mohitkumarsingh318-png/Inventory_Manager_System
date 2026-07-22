# Inventory Manager

A Flask-based inventory management backend for creating products, updating stock, and tracking stock history. The app uses Flask-SQLAlchemy with MySQL and exposes REST endpoints for product management and stock adjustments.

## What the app does

- Create, read, update, and delete products
- Increase or decrease stock with validation
- Prevent negative stock values and negative prices
- Require stock changes through dedicated stock endpoints so updates use locking and history logging
- Record stock history for each product
- Use row-level locking to reduce concurrent update conflicts

## Tech stack

- Python 3.11+
- Flask
- Flask-SQLAlchemy
- PyMySQL
- python-dotenv
- requests

## Setup

1. Install Python 3.11+ and a MySQL server.
2. Install backend dependencies:

```powershell
cd backend
python -m pip install -r requirements.txt
```

3. Create the database:

```sql
CREATE DATABASE inventory_manager;
```

4. Create a file named backend/.env with your database settings:

```env
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=inventory_manager
```

5. Start the app:

```powershell
cd backend
python app.py
```

The API runs at http://127.0.0.1:5000.

You can verify the server by opening http://127.0.0.1:5000/ or running:

```powershell
curl http://127.0.0.1:5000/
```

A healthy response returns JSON with a status of ok.

## Project structure

- backend/app.py — creates the Flask app, registers blueprints, and initializes the database
- backend/config.py — loads environment variables and configures the SQLAlchemy connection
- backend/database/db.py — creates the shared SQLAlchemy instance
- backend/models/product.py — defines the Product model
- backend/models/stock_log.py — defines the StockLog model and stock history fields
- backend/services/product_service.py — handles product CRUD logic
- backend/services/stock_service.py — handles stock updates and history creation
- backend/controllers/product_controller.py — maps HTTP requests to product service calls
- backend/controllers/stock_controllers.py — handles stock update requests
- backend/routes/product_routes.py — exposes product endpoints
- backend/routes/stock_routes.py — exposes stock increase and decrease endpoints
- backend/tests/concurrency.py — demonstrates concurrent stock update behavior

## API endpoints

### Health check

- GET /

### Products

- POST /products/ — create a product
- GET /products/ — list all products
- GET /products/<product_id> — get one product
- PUT /products/<product_id> — update a product
- PATCH /products/<product_id> — update a product
- DELETE /products/<product_id> — delete a product
- GET /products/<product_id>/stock-history — get stock history for a product

### Stock

- POST /stock/increase/<product_id> — increase stock
- POST /stock/decrease/<product_id> — decrease stock

> Stock changes must be performed through these endpoints so stock history is recorded and row-level locking is applied.

## Request bodies

### Create product

```json
{
  "name": "Widget",
  "description": "Basic widget",
  "price": 9.99,
  "stock_level": 10
}
```

### Update product

```json
{
  "name": "Updated Widget",
  "price": 12.5
}
```

> Note: `stock_level` cannot be updated through this endpoint. Use the stock adjustment endpoints below instead.

### Stock adjustment

```json
{
  "amount": 5,
  "reason": "restock"
}
```

## Data models

### Product

- id: primary key
- name: unique product name
- description: optional description
- price: numeric price
- stock_level: current stock level
- created_at / updated_at: timestamps

### StockLog

- id: primary key
- product_id: foreign key to products
- product_name: product name at the time of the change
- change: positive or negative adjustment amount
- stock_level_before: stock before the transaction
- stock_level_after: stock after the transaction
- reason: optional reason for the change
- created_at: timestamp of the event

## Example requests

Create a product:

```powershell
curl -X POST http://127.0.0.1:5000/products/ \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Widget\",\"description\":\"Basic widget\",\"price\":9.99,\"stock_level\":10}"
```

List products:

```powershell
curl http://127.0.0.1:5000/products/
```

Increase stock:

```powershell
curl -X POST http://127.0.0.1:5000/stock/increase/1 \
  -H "Content-Type: application/json" \
  -d "{\"amount\":5,\"reason\":\"restock\"}"
```

Decrease stock:

```powershell
curl -X POST http://127.0.0.1:5000/stock/decrease/1 \
  -H "Content-Type: application/json" \
  -d "{\"amount\":2,\"reason\":\"sale\"}"
```

View stock history:

```powershell
curl http://127.0.0.1:5000/products/1/stock-history
```

## Concurrency handling

Stock updates are processed with a row-level database lock on the relevant product record. If a request would push stock below zero, the update is rejected. The concurrency example in backend/tests/concurrency.py shows this behavior under repeated requests.

## Architecture summary

The project follows a lightweight layered architecture:

- Flask handles HTTP routing
- Controllers validate requests and format responses
- Services contain the business logic
- SQLAlchemy models define the database schema and persistence layer
