import csv
import json

with open("src/.observablehq/cache/pizza.csv") as f:
    reader = csv.DictReader(f)
    data = [
        {
            **row,
            "price": int(row["price"]),
            "orders": int(row["orders"]),
            "revenue": int(row["revenue"])
        }
        for row in reader
    ]
    print(json.dumps(data))
