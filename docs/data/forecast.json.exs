Mix.install([
  {:jason, "~> 1.4"},
  {:req, "~> 0.3.0"}
])

longitude = -122.47
latitude = 37.80

station = Req.get!("https://api.weather.gov/points/#{latitude},#{longitude}").body
forecast = Req.get!(station["properties"]["forecastHourly"]).body

forecast |> Jason.encode! |> IO.puts()
