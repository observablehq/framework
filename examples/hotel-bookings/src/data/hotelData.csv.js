import {readFileSync} from "fs";
import {csvParse} from "d3-dsv";
import {csvFormat} from "d3-dsv";
import {timeParse} from "d3-time-format";

const hotels = await csvParse(readFileSync("src/data/hotels.csv", "utf8"));

const hotelData = hotels.map((d) => ({
  ...d,
  IsCanceled: d.IsCanceled == 0 ? "Keep" : "Cancel",
  season: ["June", "July", "August"].includes(d.ArrivalDateMonth)
    ? "Summer"
    : ["September", "October", "November"].includes(d.ArrivalDateMonth)
    ? "Fall"
    : ["December", "January", "February"].includes(d.ArrivalDateMonth)
    ? "Winter"
    : "Spring",
  Country: d.Country == "NULL" ? "Unknown" : d.Country,
  Meal: d.Meal.trim(),
  ReservedRoomType: d.ReservedRoomType.trim(),
  AssignedRoomType: d.AssignedRoomType.trim(),
  MarketSegment:
    d.MarketSegment == "Online TA"
      ? "Online travel agent"
      : d.MarketSegment == "Offline TA/TO"
      ? "Offline travel agent / tour operator"
      : d.MarketSegment,
  arrivalDate: timeParse("%B %d, %Y")(d.ArrivalDateMonth + " " + d.ArrivalDateDayOfMonth + ", " + d.ArrivalDateYear)
}));

process.stdout.write(csvFormat(hotelData));
