using Pkg
Pkg.add("HTTP")
Pkg.add("JSON")

# It will be useful to create and commit a Project.toml to manage dependencies.
# Activate environment as shown below and add packages. Once done, remove
# any package add statements. Committing the Manifest.toml file is generally
# not recommended.
# Pkg.activate(@__DIR__)
# Pkg.instantiate()

using HTTP, JSON

longitude = -122.47
latitude = 37.80

URL = "https://api.weather.gov/points/$(latitude),$(longitude)"

function get_api_response(url::String)

    request = HTTP.request("GET",
                            url;
                            verbose = 0,
                            retries = 2)
    
    response_text = String(request.body)
    response_dict = JSON.parse(response_text)
    
    return response_dict
end

response_dict = get_api_response(URL)
hourly_dict = get_api_response(response_dict["properties"]["forecastHourly"])

JSON.print(stdout, hourly_dict)