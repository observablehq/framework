import sys

import pandas as pd
from datawrapper import Datawrapper

# Get an extract of arrests made by the Baltimore Police Department
df = pd.read_csv(
    "https://raw.githubusercontent.com/palewire/first-automated-chart/main/_notebooks/arrests.csv",
    parse_dates=["ArrestDateTime"]
)

# Create a year column
df['year'] = df.ArrestDateTime.dt.year

# Calculate the total number by year
totals_by_year = df.year.value_counts().sort_index().reset_index()

# Connect to the datawrapper api
dw = Datawrapper()

# Create a chart
chart_config = dw.create_chart(
    # Headline the chart
    title="Baltimore Arrests",
    # Set the type
    chart_type="column-chart",
    # Give the data
    data=totals_by_year,
    # Configure other bits
    metadata={
        # Set the description
        "describe": {
            "source-name": "OpenBaltimore",
            "source-url": "https://data.baltimorecity.gov/datasets/baltimore::bpd-arrests/about",
        }
    }
)

# Pull out the chart's unique identifier
chart_id = chart_config["id"]

# Publish the chart
dw.publish_chart(chart_id)

# Write the chart's embed code to stdout
html = dw.get_iframe_code(chart_id, responsive=True)
sys.stdout.write(html)