import {max, min, rollup, sort} from "d3-array";

function main() {
  const COUNT = 100_000;
  const start = performance.now();

  const counts = Array.from({length: COUNT})
    // Calculate the category of random hands
    .map(() => {
      const hand = Hand.random();
      // Convert the category into a one-element hashmap, so the reducer
      // can sum up all the counts for each category.
      return {[hand.categorize()]: 1};
    })
    // count up each category
    .reduce((acc, next) => {
      for (const [category, count] of Object.entries(next)) {
        acc[category] = (acc[category] ?? 0) + count;
      }
      return acc;
    }, {});

  const tidyData = sort(
    Object.entries(counts).map(([category, count]) => ({category, count})),
    (d) => d.category
  );

  process.stdout.write(
    JSON.stringify({
      summary: tidyData,
      meta: {count: COUNT, duration_ms: performance.now() - start}
    })
  );
}

// Here, we create types for the domain model of a poker hand. Working with
// specific types helps makes the rest of the code simpler.

class Hand {
  constructor(public cards: Card[]) {}

  static random(): Hand {
    const cards: Card[] = [];
    while (cards.length < 5) {
      const rank = Math.floor(Math.random() * 13 + 1);
      const suitRand = Math.random();
      const suit =
        suitRand < 0.25 ? Suit.Clubs : suitRand < 0.5 ? Suit.Diamonds : suitRand < 0.75 ? Suit.Hearts : Suit.Spades;
      const card = {rank, suit};
      if (cards.some((c) => c.rank === card.rank && c.suit === card.suit)) {
        continue;
      }
      cards.push(card);
    }
    return new Hand(cards);
  }

  categorize(): HandCategory {
    const rankCounts = rollup(
      this.cards,
      (ds) => ds.length,
      (d) => d.rank
    );
    const suitCounts = rollup(
      this.cards,
      (ds) => ds.length,
      (d) => d.rank
    );

    const isFlush = suitCounts.size == 1;

    let isStraight;

    if (this.cards.some((c) => c.rank == 1)) {
      // Handle aces
      const minRank = min(
        this.cards.filter((c) => c.rank !== 1),
        (d) => d.rank
      );
      const maxRank = max(
        this.cards.filter((c) => c.rank !== 1),
        (d) => d.rank
      );
      isStraight = (minRank == 2 && maxRank == 5) || (minRank == 10 && maxRank == 13);
    } else {
      const minRank = min(this.cards, (d) => d.rank);
      const maxRank = max(this.cards, (d) => d.rank);
      isStraight = maxRank! - minRank! === this.cards.length - 1;
    }

    if (isFlush && isStraight) {
      return HandCategory.StraightFlush;
    } else if (Array.from(rankCounts.values()).some((count) => count === 4)) {
      return HandCategory.FourOfAKind;
    } else if (
      Array.from(rankCounts.values()).some((count) => count === 3) &&
      Array.from(rankCounts.values()).some((count) => count === 2)
    ) {
      return HandCategory.FullHouse;
    } else if (isFlush) {
      return HandCategory.Flush;
    } else if (isStraight) {
      return HandCategory.Straight;
    } else if (Array.from(rankCounts.values()).some((count) => count === 3)) {
      return HandCategory.ThreeOfAKind;
    } else if (
      Array.from(rankCounts.values())
        .filter((count) => count === 2)
        .length == 2
    ) {
      return HandCategory.TwoPair;
    } else if (Array.from(rankCounts.values()).some((count) => count === 2)) {
      return HandCategory.OnePair;
    } else {
      return HandCategory.HighCard;
    }
  }
}

type Card = {rank: number; suit: Suit};

enum Suit {
  Clubs,
  Diamonds,
  Hearts,
  Spades
}

enum HandCategory {
  HighCard = "HighCard",
  OnePair = "OnePair",
  TwoPair = "TwoPair",
  ThreeOfAKind = "ThreeOfAKind",
  Straight = "Straight",
  Flush = "Flush",
  FullHouse = "FullHouse",
  FourOfAKind = "FourOfAKind",
  StraightFlush = "StraightFlush"
}

main();
