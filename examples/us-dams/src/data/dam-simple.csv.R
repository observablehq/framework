library(data.table)
library(dplyr)
library(readr)

dams <- fread("https://nid.sec.usace.army.mil/api/nation/csv") |> 
  dplyr::select(name = 'Dam Name',
                ownerType = 'Primary Owner Type', 
                primaryPurpose = 'Primary Purpose',
                longitude = Longitude,
                latitude = Latitude,
                state = State,
                county = County,
                city = City,
                primaryDamType = 'Primary Dam Type',
                yearCompleted = 'Year Completed',
                maxStorageAcreFt = 'Max Storage (Acre-Ft)',
                hazardPotential = 'Hazard Potential Classification',
                conditionAssessment = 'Condition Assessment',
                ) |>
  dplyr::mutate(conditionAssessment = case_when(
    conditionAssessment %in% c(NA, "Not Available", "Not Rated") ~ "Not available",
    TRUE ~ conditionAssessment
  )) |>
  dplyr::mutate(primaryPurpose = case_when(
    primaryPurpose == "" ~ "Unrecorded",
    primaryPurpose == "Fire Protection, Stock, Or Small Fish Pond" ~ "Fire, Stock, or Small Fish Pond",
    TRUE ~ primaryPurpose
  ))


cat(readr::format_csv(dams))
