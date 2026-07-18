import threading
import requests
import time
import json
import uuid

BASE = "http://127.0.0.1:5000"
HEADERS = {"Content-Type": "application/json"}

def create_product(name="LoadTest1", price=1.0, stock_level=50):
    unique_name = f"{name}-{uuid.uuid4().hex[:8]}"
    r = requests.post(
        f"{BASE}/products/",
        headers=HEADERS,
        data=json.dumps({"name": unique_name, "price": price, "stock_level": stock_level}),
    )
    r.raise_for_status()
    return r.json()["id"]

def get_product(product_id):
    r = requests.get(f"{BASE}/products/{product_id}")
    r.raise_for_status()
    return r.json()

def worker_decrease(product_id, amount, start_event, result_list, idx):
    start_event.wait()
    try:
        r = requests.post(f"{BASE}/stock/decrease/{product_id}", headers=HEADERS,
                          data=json.dumps({"amount": amount}))
        result_list[idx] = (r.status_code, r.text)
    except Exception as e:
        result_list[idx] = ("error", str(e))

def run_test(initial_stock=20, threads_count=30, per_decrement=1):
    pid = create_product(stock_level=initial_stock)
    print("Created product id:", pid, "initial_stock:", initial_stock)

    start_event = threading.Event()
    results = [None] * threads_count
    threads = []
    for i in range(threads_count):
        t = threading.Thread(target=worker_decrease, args=(pid, per_decrement, start_event, results, i))
        t.start()
        threads.append(t)

    # start all threads at once
    time.sleep(0.5)
    start_event.set()

    for t in threads:
        t.join()

    success = sum(1 for r in results if isinstance(r, tuple) and r[0] == 200)
    failed = len(results) - success
    print(f"Threads: {threads_count}, Success: {success}, Failed: {failed}")

    prod = get_product(pid)
    print("Final product stock_level:", prod.get("stock_level"))
    print("Raw responses (first 10):")
    for r in results[:10]:
        print(r)

if __name__ == "__main__":
    run_test(initial_stock=20, threads_count=30, per_decrement=1)