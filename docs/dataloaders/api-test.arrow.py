# Import libraries (must be installed)
import pandas as pd
import requests
import io
import sys

# Access, wrangle, and analyze data
url = r"https://data.ca.gov/dataset/b8c6ee3b-539d-4d62-8fa2-c7cd17c16656/resource/16bb2698-c243-4b66-a6e8-4861ee66f8bf/download/master-covid-public.csv"

r = requests.get(url)


df = pd.read_csv(
    io.StringIO(r.text),
    usecols = [
        "wwtp_name",
        "sample_collect_date",
        "sample_matrix",
        "pcr_target_avg_conc",
    ],
    dtype = {'wwtp_name': str, 'sample_collect_date': str, 'sample_matrix': str, 'pcr_target_avg_conc': float}
)
