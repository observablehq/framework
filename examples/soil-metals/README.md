# Soil metal analysis

This is an example Observable Framework project that explores soil metal concentrations in soils from mining districts in Moquegua, Peru. The purpose is to show an R data loader within a Framework project. Metals selected for [principal component analysis]((https://en.wikipedia.org/wiki/Principal_component_analysis)) are random; charts should not be interpreted as research findings.

Data source: Bedoya-Perales, N.S., Escobedo-Pacheco, E., Maus, D. et al. Dataset of metals and metalloids in food crops and soils sampled across the mining region of Moquegua in Peru. Sci Data 10, 483 (2023). https://doi.org/10.1038/s41597-023-02363-0

View the [live project](TODO).

## Data loader

A single R data loader (`soil-metals.zip.R`) reads in data from a local Excel file (`heavy-metals.xlsx`), does basic wrangling, then performs principal component analysis. Multiple outputs (as CSVs) are added to a Zip archive. 

## Charts

All charts are created as functions in `index.md` using [Observable Plot](https://observablehq.com/plot/). 