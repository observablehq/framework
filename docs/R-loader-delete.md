# R data loaders

[Some basic setup information as relevant...]. You must have the Rscript interpreter installed and available on your $PATH. Any additional modules, packages, libraries, etc., must also be installed before you can use them in a data loader.

## CSV

In a data loader with extension .csv.R:
```R run=false
# Attach libraries (must be installed)
library(readr)
library(dplyr)

# Access and prep data
penguinsMale <- read_csv("penguins.csv") |> 
            select(species, sex, body_mass_g) |>
            filter(sex == "Male")

# Convert data frame to delimited string, then write to connection stdout()
writeLines(format_csv(penguinsMale), stdout())
```

## TAR

In a data loader with extension .tar.R:

```R run=false
# Attach libraries (must be installed)
library(readr)
library(dplyr)

# Pipe chatty output to stderr
sink(stderr())

# Access and prep data
penguins <- read_csv("penguins.csv")

penguinsMale <- penguins |>
                select(species, sex, body_mass_g) |>
                filter(sex == "Male")

penguinsFemale <- penguinsMale <- penguins |>
                  select(species, sex, body_mass_g) |>
                  filter(sex == "Female")

# Save the results and tar
setwd(tempdir())
write_csv(penguinsMale, "penguinsMale.csv")
write_csv(penguinsFemale, "penguinsFemale.csv")
tar("/dev/stdout")
```
