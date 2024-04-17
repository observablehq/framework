import {utcMonth} from "d3-time";
import JSZip from "jszip";

const TOP_N_COUNT = 10;
const MONTHS_OF_DATA = 12;

function monthlyZipUrl(date) {
  const id = date.toLocaleString("en-US", {month: "short", year: "2-digit"}).toLowerCase().replace(" ", "");
  return `http://ratings.fide.com/download/standard_${id}frl.zip`;
}

function isActivePlayer(player) {
  return player.flags !== "i" && player.flags !== "wi";
}

async function fetchAndFilterTopPlayers() {
  const today = utcMonth();
  const rankingsByMonth = [];
  for (const month of utcMonth.range(utcMonth.offset(today, -(MONTHS_OF_DATA - 1)), utcMonth.offset(today, 1))) {
    const rows = await fetchFideData(monthlyZipUrl(month));
    rows.sort((a, b) => b.rating - a.rating);
    rankingsByMonth.push(rows.map((d) => ({...d, month})));
  }
  const womens = rankingsByMonth.map((rankings) => rankings.filter((d) => d.sex === "F").slice(0, TOP_N_COUNT)).flat();
  const mens = rankingsByMonth.map((rankings) => rankings.filter((d) => d.sex === "M").slice(0, TOP_N_COUNT)).flat();
  return {womens, mens, MONTHS_OF_DATA, TOP_N_COUNT};
}

async function fetchFideData(url) {
  return fetch(url)
    .then((res) => JSZip.loadAsync(res.arrayBuffer()))
    .then((archive) => archive.file(/\.txt$/)[0].async("text"))
    .then(parseFideFile);
}

function parseFideFile(text) {
  const lines = text.split("\n");
  const records = [];
  for (let i = 1; i < lines.length; ++i) {
    const line = lines[i];
    const record = {
      id: line.substring(0, 14).trim(),
      name: line.substring(15, 75).trim(),
      federation: line.substring(76, 79).trim(),
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
    if (isActivePlayer(record)) {
      records.push(record);
    }
  }
  return records;
}

process.stdout.write(JSON.stringify(await fetchAndFilterTopPlayers()));
