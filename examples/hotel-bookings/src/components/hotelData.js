import * as d3 from "npm:d3";
import {FileAttachment} from "npm:@observablehq/stdlib";

const hotels = await FileAttachment("../data/hotels.csv").csv({typed: true});

export const hotelData = hotels.map((d) => ({
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
  arrivalDate: d3.timeParse("%B %d, %Y")(d.ArrivalDateMonth + " " + d.ArrivalDateDayOfMonth + ", " + d.ArrivalDateYear)
}));
