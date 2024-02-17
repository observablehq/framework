import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

// requires gson in the classpath. For instance, have the following env var set:
// export CLASSPATH=/Users/<YOUR_USER_NAME>/.m2/repository/com/google/code/gson/gson/2.8.6/gson-2.8.6.jar
public class ForecastJava {

  public static void main(String[] args) {
    double latitude = 37.80;
    double longitude = -122.47;

    try {
      JsonObject station = getJson("https://api.weather.gov/points/" + latitude + "," + longitude);
      JsonObject properties = station.getAsJsonObject("properties");
      String forecastUrl = properties.getAsJsonPrimitive("forecastHourly").getAsString();
      JsonObject forecast = getJson(forecastUrl);

      System.out.println(forecast);
    } catch (IOException e) {
      e.printStackTrace();
    }
  }

  private static JsonObject getJson(String url) throws IOException {
    HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
    connection.setRequestMethod("GET");
    connection.setRequestProperty("Accept", "application/json");

    try (InputStream inputStream = connection.getInputStream();
        InputStreamReader reader = new InputStreamReader(inputStream)) {

      return JsonParser.parseReader(reader).getAsJsonObject();
    } finally {
      connection.disconnect();
    }
  }
}
