import "dotenv/config";
import Airtable from "airtable";
import {csvFormat} from "d3-dsv";

const {AIRTABLE_PAT, AIRTABLE_DB} = process.env;

Airtable.configure({apiKey: AIRTABLE_PAT});

const base = Airtable.base(AIRTABLE_DB!);

const data: any[] = [];

base("penguins")
  .select({view: "Grid view"})
  .eachPage(
    (records, fetchNextPage) => {
      records.forEach((record) => data.push(record.fields));
      fetchNextPage();
    },
    (err) => {
      if (err) throw err;
      process.stdout.write(csvFormat(data));
    }
  );
