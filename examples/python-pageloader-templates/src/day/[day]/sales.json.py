import argparse
import csv
import json

parser = argparse.ArgumentParser()
parser.add_argument('--day')
args = parser.parse_args()

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
        if row["day_of_week"].lower() == args.day
    ]
    print(json.dumps(data))
