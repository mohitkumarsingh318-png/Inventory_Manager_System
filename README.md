# Inventory Manager

A simple Flask-based inventory management backend for tracking products and stock movements. The project includes CRUD operations for products, stock adjustments, and a concurrency-safe stock update flow.

## Why this project exists

This project demonstrates how to build a small but practical backend system for inventory control. It is designed to show how product records, stock changes, and data safety rules can be handled in a clean, layered architecture.

## Features

- Product management: create, read, update, and delete products
- Stock management: increase or decrease stock safely
- Negative stock prevention
- Concurrency-safe stock updates using database row locking
- Stock history tracking for each product

## Setup instructions

1. Install Python 3.10+ and a MySQL server.
2. Install the backend dependencies:

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

5. Start the application:

```powershell
cd backend
python app.py
```

The backend will run at http://127.0.0.1:5000.

### First run checklist

Before testing the API, make sure:

- MySQL is installed and the service is running
- The database named inventory_manager exists
- The backend/.env file contains the correct credentials
- You are running the app from the backend folder

You can verify that the server started correctly by opening http://127.0.0.1:5000/ in your browser or by running:

```powershell
curl http://127.0.0.1:5000/
```

A healthy response should return JSON with a status of ok.

## Project structure

The backend is organized into clear layers so each responsibility stays separate:

- backend/app.py — creates the Flask app, registers the blueprints, and initializes the database
- backend/config.py — loads environment variables and defines the SQLAlchemy database connection settings
- backend/database/db.py — creates the shared SQLAlchemy instance used across the app
- backend/models/product.py — defines the Product model and its serialization logic
- backend/models/stock_log.py — defines the StockLog model used to record stock changes over time
- backend/services/product_service.py — contains the business logic for creating, reading, updating, and deleting products
- backend/services/stock_service.py — handles stock updates, validation, row locking, and stock history retrieval
- backend/controllers/product_controller.py — translates HTTP requests into product service calls and JSON responses
- backend/controllers/stock_controllers.py — handles stock-related requests and validates incoming payloads
- backend/routes/product_routes.py — exposes product endpoints such as CRUD and stock-history access
- backend/routes/stock_routes.py — exposes stock increase and decrease endpoints
- backend/tests/concurrency.py and backend/tests/concurrency_test.py — demonstrate concurrent stock update behavior

## Request flow

1. A client sends a request to an endpoint under the Flask app.
2. The route in the routes folder receives the request and forwards it to the matching controller.
3. The controller validates the input and calls the service layer.
4. The service uses the SQLAlchemy models to read or update the database.
5. The response is returned as JSON to the client.

## Requirements

Python 3.10+ and a MySQL server are recommended.

Install the Python dependencies:

```powershell
cd backend
python -m pip install -r requirements.txt
```

## Database setup

Create a MySQL database:

```sql
CREATE DATABASE inventory_manager;
```

Create a file named backend/.env with your local database settings:

```env
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=inventory_manager
```

## Run the backend

```powershell
cd backend
python app.py
```

The server will start on http://127.0.0.1:5000.

## API overview

- GET / — health check
- POST /products/ — create a product
- GET /products/ — list all products
- GET /products/<id> — fetch one product
- PUT /products/<id> — update a product
- DELETE /products/<id> — delete a product
- POST /stock/increase/<id> — increase stock
- POST /stock/decrease/<id> — decrease stock
- GET /products/<id>/stock-history — view stock history

Example product payload:

```json
{
  "name": "Widget",
  "description": "Basic widget",
  "price": 9.99,
  "stock_level": 10
}
```

Example stock update payload:

```json
{
  "amount": 5,
  "reason": "restock"
}
```

## Database model overview

The application uses two main database tables:

- products
  - id: primary key
  - name: product name
  - description: optional description
  - price: numeric price
  - stock_level: current available stock
  - created_at / updated_at: timestamps

- stock_logs
  - id: primary key
  - product_id: foreign key to products
  - change: positive or negative stock change
  - reason: optional reason for the change
  - created_at: timestamp of the event

This design allows the system to keep both the current stock value and a history of stock changes.

## Example API requests

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

## Stock update and concurrency handling

Each stock change is processed through the stock service using a row-level database lock on the product record. This prevents two simultaneous requests from reading the same old stock value and overwriting each other. Before the update is committed, the system checks that the resulting stock will not go below zero, and it records the change in a stock log for audit tracking.

## Run the concurrency test

1. Start the server.
2. Ensure a product with id 1 exists and has limited stock.
3. Run:

```powershell
cd backend
python tests/concurrency.py
```

The script reports how many requests succeeded and how many were blocked by the stock safety checks.

## Architecture summary

This project follows a lightweight layered architecture:

- Flask handles HTTP routing and request lifecycle
- Controllers receive API requests and format responses
- Services contain business rules and database operations
- SQLAlchemy models define the data structure and persistence layer

That separation makes the code easier to maintain and extend as the system grows.

## How to contribute

If you want to improve the project, you can:

- add validation for product names and prices
- improve error handling for edge cases
- add authentication and user roles
- introduce pagination for large product lists
- add tests for product and stock service behavior

## Future improvements

Potential enhancements for the next version include:

- support for warehouse and supplier management
- role-based access control
- export/import of inventory data
- dashboard reporting and analytics
- integration with a frontend application
