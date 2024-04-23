const longitude = -122.47;
const latitude = 37.8;

async function json(url) {
  const response = await fetch(url, {headers: {"User-Agent": "(observablehq.com, support@observablehq.com)"}});
  if (!response.ok) throw new Error(`fetch failed: ${response.status}`);
  return await response.json();
}

const station = await json(`https://api.weather.gov/points/${latitude},${longitude}`);
const forecast = await json(station.properties.forecastHourly);

process.stdout.write(JSON.stringify(forecast));
