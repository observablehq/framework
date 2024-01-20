import {tsvParse, csvFormat} from "d3-dsv";

const LAUNCH_LOG_URL = "https://planet4589.org/space/gcat/tsv/derived/launchlog.tsv";
const LAUNCH_VEHICLES_URL = "https://planet4589.org/space/gcat/tsv/tables/lv.tsv";

// "top" vehicles and launching states

const TOP_LAUNCH_VEHICLES = ["Falcon9","R-7","R-14","Thor","DF5","R-36","Proton","Titan","Zenit","Atlas"];
const TOP_STATES_MAP = ({
  "US": "United States",
  "SU": "Soviet Union",
  "RU": "Russia",
  "CN": "China"
});

// load and parse launch vehicles

const launchVehicles = await fetch(LAUNCH_VEHICLES_URL)
  .then(response => response.text())
  .then(tsvParse);

// construct map to lookup vehicle family from name

const launchVehicleFamilyMap = launchVehicles
  .reduce((map, d) => ({...map, [d["#LV_Name"]]: d.LV_Family.trim()}), {});

// utility functions

const establishState = d => TOP_STATES_MAP[d] ?? "Other";
const establishFamily = d => {
  const family = launchVehicleFamilyMap[d];
  return TOP_LAUNCH_VEHICLES.includes(family) ? family : "Other";
}
const parseDate = dateString => new Date(
  dateString.split(" ").filter(d => d.length > 0).slice(0, 3).join(" ")
);

// load and parse launch-log and trim down to smaller size

const launchHistory = await fetch(LAUNCH_LOG_URL)
  .then(response => response.text())
  .then(rows => tsvParse(rows, (d) => ({
       date: parseDate(d.Launch_Date),
       state: establishState(d.LVState),
       stateId: d.LVState,
       family: establishFamily(d.LV_Type)
    })).filter((d) => !isNaN(d.date) && d.state !== undefined)
  );

// write out csv formatted data

process.stdout.write(csvFormat(launchHistory));
