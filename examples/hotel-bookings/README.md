[Framework examples →](../)

# Hotel bookings

View live: <https://observablehq.observablehq.cloud/framework-example-hotel-bookings/>

This dashboard explores reservation data for a resort in Portugal from Antonio _et al._ (2021), recorded between July 2015 and August 2017. Charts highlight differences in daily rates, visit seasons, guest nationality, and room type reserved for different booking types (_e.g._ corporate, direct, or online reservations).

**Data source:** Antonio et al (2021). Hotel booking demand datasets. Data in Brief (22): 41-49. https://doi.org/10.1016/j.dib.2018.11.126

## Implementation

```
.
├── README.md
├── observablehq.config.js
├── package.json
└── src
    ├── components
    │   ├── bigNumber.js
    │   └── donutChart.js
    ├── data
    │   ├── hotelData.csv
    └── index.md
```

No dependencies other than Framework.

### Data

Data was downloaded directly from Antonio _et al._ (2021), with minor data wrangling to produce the simplified data (`hotelData.csv`) used in the dashboard.

### Components

This example has two reusable components for building the visualizations: `bigNumber.js` and `donutChart.js`. The `bigNumber.js` component creates a simple big number box. The `donutChart.js` component is made with [D3](https://d3js.org/).
