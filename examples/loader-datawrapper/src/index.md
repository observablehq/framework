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

To run this data loader, you will need to create an API token in Datawrapper and set it as an environment variable named `DATAWRAPPER_ACCESS_TOKEN`.

You’ll also need python3 and the pandas and datawrapper modules installed and available on your `$PATH`.

</div>

<div class="tip">

We recommend using a [Python virtual environment](https://observablehq.com/framework/loaders#venv), such as with venv or uv, and managing required packages via `requirements.txt` rather than installing them globally.

</div>

The above data loader lives in `data/chart.html.py`, so we can load the data using `data/chart.html` with `FileAttachment`:

```js echo
const iframe = FileAttachment("data/chart.html").text();
```

We can then insert the HTML into the page by creating an element and setting its `innerHTML` attribute:

```html echo
<div id="chart"></div>
```

```js echo
document.getElementById("chart").innerHTML = iframe;
```