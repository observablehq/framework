console.log("magnitude,longitude,latitude"); // output a header
fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson")
  .then((response) => response.json())
  .then((collection) => {
    console.warn(collection.features);
    collection.features.forEach((feature) => {
      console.log(`${feature.properties.mag},${feature.geometry.coordinates.join(",")}`);
    });
  });
