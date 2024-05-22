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
                # waterway = 'River or Stream Name',
                primaryDamType = 'Primary Dam Type',
                # heightFt = 'Dam Height (Ft)',
                # length = 'Dam Length (Ft)',
                yearCompleted = 'Year Completed',
                # yearsModified = 'Years Modified',
                maxStorageAcreFt = 'Max Storage (Acre-Ft)',
                # lastInspectionDate = 'Last Inspection Date',
                # inspectionFrequency = 'Inspection Frequency',
                hazardPotential = 'Hazard Potential Classification',
                conditionAssessment = 'Condition Assessment',
                # conditionAssessmentDate = 'Condition Assessment Date'
                ) |>
  dplyr::mutate(conditionAssessment = case_when(
    conditionAssessment %in% c(NA, "Not Available", "Not Rated") ~ "Not available",
    TRUE ~ conditionAssessment
  ))


cat(readr::format_csv(dams))
