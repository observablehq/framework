import {utcMonth} from "d3-time";
import JSZip from "jszip";

const TOP_N_COUNT = 10;
const MONTHS_OF_DATA = 12;

function monthlyZipUrl(date) {
  const id = date
    .toLocaleString("en-US", {
      month: "short",
      year: "2-digit"
    })
    .toLowerCase()
    .replace(" ", "");
  return `http://ratings.fide.com/download/standard_${id}frl.zip`;
}

async function fetchAndFilterTopPlayers() {
  const today = utcMonth();
  const rankingsByMonth = await Promise.all(
    utcMonth
      .range(utcMonth.offset(today, -11), utcMonth.offset(today, 1))
      .map((month) =>
        fetchFideData(monthlyZipUrl(month)).then((rows) =>
          rows.sort((a, b) => b.rating - a.rating).map((d) => ({...d, month}))
        )
      )
  );

  // top active women
  const womens = rankingsByMonth
    .map((rankings) => rankings.filter((d) => d.sex === "F" && d.flags !== "wi").slice(0, TOP_N_COUNT))
    .flat();

  // top active men
  const mens = rankingsByMonth
    .map((rankings) => rankings.filter((d) => d.sex === "M" && d.flags !== "i").slice(0, TOP_N_COUNT))
    .flat();

  return {womens, mens, MONTHS_OF_DATA, TOP_N_COUNT};
}

async function fetchFideData(url) {
  return fetch(url)
    .then((res) => JSZip.loadAsync(res.arrayBuffer()))
    .then((archive) => archive.file(Object.keys(archive.files).find((name) => name.endsWith(".txt"))).async("text"))
    .then(parseFideFile);
}

function parseFideFile(text) {
  return text
    .split("\n")
    .slice(1) // skip header row
    .map((line) => ({
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
    }));
}

console.log(JSON.stringify(await fetchAndFilterTopPlayers()));
