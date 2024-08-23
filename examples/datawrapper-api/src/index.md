# Datawrapper API

Here’s a Python data loader that generates an HTML [iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe) tag that embeds a [Datawrapper](https://www.datawrapper.de/) chart.

```python
import sys

import pandas as pd
from datawrapper import Datawrapper

# Read in the data file, which is drawn from a Datawrapper example
# https://academy.datawrapper.de/article/281-examples-of-datawrapper-dot-charts
df = pd.read_csv("src/data/chart.csv")

# Connect to the Datawrapper api
dw = Datawrapper()

# Search if the chart already exists
title = "Germany is the third-oldest country in the world"
search_result = dw.get_charts(search=title)

# If the chart already exists, return its id
if search_result['list']:
    chart_id = search_result['list'][0]["id"]
    sys.stdout.write(chart_id)
    sys.exit()

# If it doesn't exist, create the chart
chart_config = dw.create_chart(
    # Headline the chart
    title=title,
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
        },
        "publish": {
            "autoDarkMode": True,
        },
    }
)

# Pull out the chart's unique identifier
chart_id = chart_config["id"]

# Publish the chart
dw.publish_chart(chart_id)

# Write the chart's unique identifier to stdout
sys.stdout.write(chart_id)
```

<div class="note">

You’ll also need python3 and the [`pandas`](https://pypi.org/project/pandas/) and [`datawrapper`](https://pypi.org/project/datawrapper/) modules installed and available on your `$PATH`.

We recommend using a [Python virtual environment](https://observablehq.com/framework/loaders#venv), such as with venv or uv, and managing required packages via `requirements.txt` rather than installing them globally.

You will also need to create an API token with [Datawrapper](https://www.datawrapper.de/) and set it as an environment variable named `DATAWRAPPER_ACCESS_TOKEN`. You can learn how by visiting the site's [“Getting Started” guide](https://developer.datawrapper.de/docs/getting-started). You'll want to give the token permission to create and publish charts (see the [reference documentation](https://developer.datawrapper.de/reference/postchartsidpublish) for details).
</div>

The above data loader lives in `data/chart.txt.py`, so we can load the data into an HTML element using `data/chart.txt` with `FileAttachment`. We'll embed the chart in the page using Datawrapper's [web components](https://blog.datawrapper.de/web-component-embedding/).

```js echo
const chartId = await FileAttachment("data/chart.txt").text()
const tag = display(document.createElement('script'));
tag.setAttribute('src', `https://datawrapper.dwcdn.net/${chartId}/embed.js`);
```
