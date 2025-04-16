# Attach libraries (must be installed)
library(readxl)
library(dplyr)
library(tidyr)
library(janitor)
library(stringr)
library(readr)

# Access and wrangle data
# Get only soil metal contentrations
hm_soils <- read_xlsx("docs/data/heavy-metals.xlsx", skip = 1, na = "-") |>
    clean_names() |>
    slice(-1) |>
    select(-c(3, 4, 5, 14, 15, 16, 19:49)) |>
    rename(altitude_masl = altitude_m_a_s_l)

# Update column names to only metal (e.g. "aluminum")
metal_matrix <- c(sub("_.*", "", names(hm_soils)[13:35]))
colnames(hm_soils)[13:35] <- metal_matrix

# Replace values below detection limit with LOD / 2:
detect_function <- function(vec) {
    ifelse(str_detect(vec, "<"),
        as.numeric(str_replace(vec, "<", "")) / 2,
        as.numeric(vec)
    )
}

hm_clean <- hm_soils |>
    mutate(across(13:35, detect_function))

# Principal component analysis
pca_metals <- c("aluminum", "arsenic", "barium", "calcium", "chromium", "cobalt", "copper", "iron", "magnesium", "lead", "potassium", "vanadium")

# Subset with location and sampling information, and metals above (complete)
soil_subset <- hm_clean |>
    select(1:12, all_of(pca_metals)) |>
    drop_na()

# Only metal variables for PCA
pca_subset <- soil_subset |>
    select(-(1:12))

# PCA:
soil_pca <- prcomp(pca_subset, scale = TRUE)

# PCA results

# Loadings
var_loadings <- as.data.frame(soil_pca$rotation) |>
    tibble::rownames_to_column(var = "metal")

# Variance explained
var_exp <- data.frame(
    pc = names(var_loadings[2:length(var_loadings)]),
    variance = soil_pca$sdev^2 / sum(soil_pca$sdev^2)
)

# Scores
obs_scores <- data.frame(soil_subset, soil_pca$x)

# Scaled loadings (as in factoextra)
scaling <- min(
    (max(obs_scores["PC2"]) - min(obs_scores["PC2"]) / (max(var_loadings["PC2"]) - min(var_loadings["PC2"]))),
    (max(obs_scores["PC1"]) - min(obs_scores["PC1"]) / (max(var_loadings["PC1"]) - min(var_loadings["PC1"])))
)

# Note: factoextra uses 0.7 * scaling
var_loadings_scaled <- var_loadings |>
    mutate(
        PC1_scale = 0.7 * scaling * PC1,
        PC2_scale = 0.7 * scaling * PC2
    )

# Add to zip archive, write to stdout
setwd(tempdir())

write_csv(hm_clean, "soil-metals.csv")
write_csv(var_loadings_scaled, "var-loadings.csv")
write_csv(var_exp, "var-explained.csv")
write_csv(obs_scores, "obs-scores.csv")

system("zip - -r .")
