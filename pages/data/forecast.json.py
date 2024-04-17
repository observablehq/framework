import json
import requests
import sys

longitude = -122.47
latitude = 37.80

station = requests.get(f"https://api.weather.gov/points/{latitude},{longitude}").json()
forecast = requests.get(station["properties"]["forecastHourly"]).json()

json.dump(forecast, sys.stdout)
