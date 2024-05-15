library(tidyverse)

dams <- read_csv("docs/data/nid-dams.csv") |>
  select(name = 'Dam Name',
  ownerType = 'Primary Owner Type', 
  primaryPurpose = 'Primary Purpose',
  latitude = Latitude,
  longitude = Longitude,
  state = State,
  county = County,
  city = City,
  waterway = 'River or Stream Name',
  primaryDamType = 'Primary Dam Type',
  heightFt = 'Dam Height (Ft)',
  length = 'Dam Length (Ft)',
  yearCompleted = 'Year Completed',
  yearsModified = 'Years Modified',
  maxStorageAcreFt = 'Max Storage (Acre-Ft)',
  lastInspectionDate = 'Last Inspection Date',
  inspectionFrequency = 'Inspection Frequency',
  hazardPotential = 'Hazard Potential Classification',
  conditionAssessment = 'Condition Assessment',
  conditionAssessmentDate = 'Condition Assessment Date'
  ) |>
  mutate(conditionAssessment = case_when(
    conditionAssessment %in% c(NA, "Not Available", "Not Rated") ~ "Not available",
    TRUE ~ conditionAssessment
  )) |>
  mutate(yearsSinceInspection = (difftime(Sys.Date(), lubridate::parse_date_time2(lastInspectionDate, "mdy", cutoff_2000 = 24), units = c("days")))/365)
# The line above ensures that any last inspection dates (indicated with a 2-digit year) are recored as 1900s dates (e.g. 1935, instead of 2035)

cat(format_csv(dams))
