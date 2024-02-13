// Import d3 functions:
import * as d3 from "d3";

// Access and wrangle data
const url = "https://api.scryfall.com/cards/search?order=cmc&q=c:red%20pow=3";

const magicCards = await d3.json(url);

const magicCardsData = magicCards.data.map((d) => ({
  name: d.name,
  release: d.released_at,
  mana_cost: d.mana_cost,
  type: d.type_line,
  set: d.set_name,
  rarity: d.rarity
}));

// Write as JSON to standard output:
process.stdout.write(JSON.stringify(magicCardsData));
