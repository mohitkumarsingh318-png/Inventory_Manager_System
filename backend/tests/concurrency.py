import threading
import requests
import time
import json
import uuid
import os
import argparse

HEADERS = {"Content-Type": "application/json"}

def create_product(base, headers, name="LoadTest1", price=1.0, stock_level=50):
    unique_name = f"{name}-{uuid.uuid4().hex[:8]}"
    r = requests.post(
        f"{base}/products/",
        headers=headers,
        data=json.dumps({"name": unique_name, "price": price, "stock_level": stock_level}),
    )
    r.raise_for_status()
    return r.json()["id"]

def get_product(base, headers, product_id):
    r = requests.get(f"{base}/products/{product_id}", headers=headers)
    r.raise_for_status()
    return r.json()

def worker_decrease(base, headers, product_id, amount, start_event, result_list, idx):
    start_event.wait()
    try:
        r = requests.post(f"{base}/stock/decrease/{product_id}", headers=headers,
                          data=json.dumps({"amount": amount}))
        result_list[idx] = (r.status_code, r.text)
    except Exception as e:
        result_list[idx] = ("error", str(e))

def run_test(base, headers, initial_stock=20, threads_count=30, per_decrement=1):
    pid = create_product(base, headers, stock_level=initial_stock)
    print("Created product id:", pid, "initial_stock:", initial_stock)

    start_event = threading.Event()
    results = [None] * threads_count
    threads = []
    for i in range(threads_count):
        t = threading.Thread(
            target=worker_decrease,
            args=(base, headers, pid, per_decrement, start_event, results, i),
        )
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

    prod = get_product(base, headers, pid)
    print("Final product stock_level:", prod.get("stock_level"))
    print("Raw responses (first 10):")
    for r in results[:10]:
        print(r)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Concurrency test for stock decreases")
    parser.add_argument("--token", default=os.getenv("INVENTORY_API_TOKEN"))
    parser.add_argument("--base", default=os.getenv("INVENTORY_API_BASE_URL", "http://127.0.0.1:5000"))
    parser.add_argument("--initial-stock", type=int, default=20)
    parser.add_argument("--threads", type=int, default=30)
    parser.add_argument("--decrement", type=int, default=1)
    args = parser.parse_args()

    if not args.token:
        parser.error("Authentication is required. Provide --token or set INVENTORY_API_TOKEN.")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {args.token}",
    }
    run_test(
        args.base,
        headers,
        initial_stock=args.initial_stock,
        threads_count=args.threads,
        per_decrement=args.decrement,
    )
