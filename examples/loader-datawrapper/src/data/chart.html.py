import sys

import pandas as pd
from datawrapper import Datawrapper

# Read in the data file, which is drawn from a Datawrapper example
# https://academy.datawrapper.de/article/281-examples-of-datawrapper-dot-charts
df = pd.read_csv("src/data/chart.csv")

# Connect to the Datawrapper api
dw = Datawrapper()

# Create the chart
chart_config = dw.create_chart(
    # Headline the chart
    title="Germany is the third-oldest country in the world",
    # Set the type
    chart_type="d3-dot-plot",
    # Give the data
    data=df,
    # Configure everything about the chart
    metadata={
        # Set the description
        "describe": {
            "intro": "Median age in the three countries with the oldest population and selected other countries, in years",
            "source-name": "Estimates by the CIA World Factbook, 2018",
            "source-url": "https://www.cia.gov/library/publications/resources/the-world-factbook/fields/343rank.html",
        },
        # Configure the chart
        "visualize": {
            "custom-range": [
                "35",
                "55"
            ],
            "range-extent": "custom",
            "highlight-range": True,
            "replace-flags": {
                "style": "4x3",
                "enabled": True
            },
            "color-by-column": True,
            "show-color-key": True,
            "color-category": {
                "map": {
                    "Male": "#94c4d1",
                    "Female": "#ffca76",
                    "Combined": "#545a5d"
                },
            },
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
