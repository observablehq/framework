import { range } from "d3-array";
import AdmZip from "adm-zip";
import request from "request";

const TOP_N_COUNT = 10;
const MONTHS_OF_DATA = 12;

async function fetchAndFilterTopPlayers() {
  const today = new Date();
  const ulrs = range(MONTHS_OF_DATA).map(i => {
    const date = new Date(today.getFullYear(), today.getMonth() - i);
    const year = date.getFullYear().toString().slice(-2);
    const monthId = date.toLocaleString('default', {month: 'short'}).toLowerCase();
    return {
      month: new Date(date.getFullYear(), date.getMonth(), 1),
      url: `http://ratings.fide.com/download/standard_${monthId}${year}frl.zip`
     }
  });

  const rankingsByMonth = await Promise
    .all(ulrs.map(({ url, month }) => fetchFideData(url)
    .then(rows => rows
      .sort((a, b) => b.rating - a.rating)
      .map(d => ({...d, month }))
    )));

  // top active women
  const womens = rankingsByMonth.map(rankings => rankings
    .filter(d => d.sex === "F" && d.flags !== "wi")
    .slice(0, TOP_N_COUNT)
  ).flat();

  // top active men
  const mens = rankingsByMonth.map(rankings => rankings
    .filter(d => d.sex === "M" && d.flags !== "i")
    .slice(0, TOP_N_COUNT)
  ).flat();

  return { womens, mens, MONTHS_OF_DATA, TOP_N_COUNT };
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
    id: +line.substring(0, 14).trim(),
    name: line.substring(15, 75).trim(),
    // federation: line.substring(76, 79).trim(),
    sex: line.substring(80, 83).trim(),
    title: line.substring(84, 88).trim(),
    // wtit: line.substring(89, 93).trim(),
    // otit: line.substring(94, 108).trim(),
    // foa: line.substring(109, 112).trim(),
    rating: +line.substring(113, 118).trim(),
    // games: +line.substring(119, 122).trim(),
    // ratingKFactor: +line.substring(123, 125).trim(),
    born: +line.substring(126, 131).trim(),
    flags: line.substring(132, 136).trim()
  };
}

console.log(JSON.stringify(await fetchAndFilterTopPlayers()));
