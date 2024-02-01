import { range } from "d3-array";
import AdmZip from "adm-zip";
import request from "request";

const TARGET_SEX = "F";
const TOP_N_COUNT = 10;
const MONTHS_OF_DATA = 12;

function fetchAndFilterTopPlayers() {
  const today = new Date();
  const ulrs = range(MONTHS_OF_DATA).map(i => {
    const date = new Date(today.getFullYear(), today.getMonth() - i);
    const year = date.getFullYear().toString().slice(-2);
    const month = date.toLocaleString('default', {month: 'short'})
          .toLowerCase();
    return {
      month: new Date(date.getFullYear(), date.getMonth(), 1),
      url: `http://ratings.fide.com/download/standard_${month}${year}frl.zip`
    }
  });

  return Promise.all(ulrs.map(({ url, month }) => fetchFideData(url)
    .then(rows => rows.filter(d => d.Sex === TARGET_SEX)
      .sort((a, b) => b.Rank - a.Rank)
      .slice(0, TOP_N_COUNT)
      .map(d => ({...d, month }))
    )))
   .then(months => months.flat());
}

async function fetchFideData(url) {
  return new Promise((resolve, reject) => {
    request.get({url, encoding: null}, (err, res, body) => {
      if (err) reject(err);
      const zip = new AdmZip(body);
      resolve(parseFideFile(zip.readAsText(zip.getEntries()[0])));
    });
  });
}

function parseFideFile(text) {
  // skip header row
  return text.split("\n").slice(1).map(parseFideLine);
}

function parseFideLine(line) {
  return {
    // ID: +line.substring(0, 14).trim(),
    Name: line.substring(15, 75).trim(),
    // Federation: line.substring(76, 79).trim(),
    Sex: line.substring(80, 83).trim(),
    Title: line.substring(84, 88).trim(),
    // WTit: line.substring(89, 93).trim(),
    // OTit: line.substring(94, 108).trim(),
    // FOA: line.substring(109, 112).trim(),
    Rank: +line.substring(113, 118).trim()
    // Games: +line.substring(119, 122).trim(),
    // RatingKFactor: +line.substring(123, 125).trim(),
    // BirthYear: +line.substring(126, 131).trim(),
    // Flags: line.substring(132, 136).trim()
  };
}

console.log(JSON.stringify(await fetchAndFilterTopPlayers()));
