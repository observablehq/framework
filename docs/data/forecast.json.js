const longitude = -122.47;
const latitude = 37.80;

async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`fetch failed: ${response.status}`);
  return await response.json();
}

const station = await json(`https://api.weather.gov/points/${latitude},${longitude}`);
const forecast = await json(station.properties.forecast);
const forecastHourly = await json(station.properties.forecastHourly);

process.stdout.write(JSON.stringify({station, forecast, forecastHourly}, null, 2));
