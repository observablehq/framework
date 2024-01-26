// const name = "Berkeley", longitude = -122.27, latitude = 37.87;
const name = "San Francisco", longitude = -122.43, latitude = 37.788;

async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`fetch failed: ${response.status}`);
  return await response.json();
}

const station = await json(`https://api.weather.gov/points/${latitude},${longitude}`);
const forecast = await json(station.properties.forecast);
const forecastHourly = await json(station.properties.forecastHourly);
// const forecastGridData = await json(station.properties.forecastGridData);
// const observationStations = await json(station.properties.observationStations);
// const forecastZone = await json(station.properties.forecastZone);

console.log(
  JSON.stringify(
    {
      name,
      station,
      forecast,
      forecastHourly,
      // forecastGridData,
      // observationStations,
      // forecastZone
    },
    null,
    2
  )
);
