# Datawrapper data loader

Here’s a Python data loader that generates an HTML [iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe) tag that embeds a [Datawrapper](https://www.datawrapper.de/) chart.

```python
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
```

<div class="note">

You’ll also need python3 and the [`pandas`](https://pypi.org/project/pandas/) and [`datawrapper`](https://pypi.org/project/datawrapper/) modules installed and available on your `$PATH`. 

We recommend using a [Python virtual environment](https://observablehq.com/framework/loaders#venv), such as with venv or uv, and managing required packages via `requirements.txt` rather than installing them globally.

You will also need to create an API token with [Datawrapper](https://www.datawrapper.de/) and set it as an environment variable named `DATAWRAPPER_ACCESS_TOKEN`. You can learn how by visiting the site's [“Getting Started” guide](https://developer.datawrapper.de/docs/getting-started). You'll want to give the token permission to read all of the options and to read and write charts.

Be aware that this example will publish a new chart to your account each time it runs.
</div>

The above data loader lives in `data/chart.html.py`, so we can load the data into an HTML element using `data/chart.html` with `FileAttachment`:

```js echo
const div = display(document.createElement("DIV"));  
div.innerHTML = await FileAttachment("data/chart.html").text();  
```