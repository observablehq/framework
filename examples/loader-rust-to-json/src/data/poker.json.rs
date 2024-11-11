//! Since Framework uses rust-script, we can define dependencies here.
//!
//! ```cargo
//! [dependencies]
//! serde = { version = "1.0.203", features = ["derive"] }
//! serde_json = "1.0.117"
//! rand = "0.8.5"
//! rayon = "1.10.0"
//! ```

use rand::Rng;
use rayon::prelude::*;
use serde::Serialize;
use serde_json::json;
use std::collections::HashMap;

fn main() {
    const COUNT: u32 = 10_000_000;
    let start = std::time::Instant::now();

    let counts = (0..COUNT)
        // This line breaks the work up into multiple parallel jobs.
        .into_par_iter()
        // Calculate the category of random hands
        .map(|_| {
            let hand = Hand::random();
            // Convert the category into a one-element hashmap, so the reducer
            // can sum up all the counts for each category.
            let mut map = HashMap::new();
            map.insert(hand.categorize(), 1);
            map
        })
        // count up each category
        .reduce(
            || HashMap::with_capacity(10),
            |mut acc, map| {
                for (category, count) in map {
                    *acc.entry(category).or_insert(0) += count;
                }
                acc
            },
        );

    let mut tidy_data = counts
        .into_iter()
        .map(|(category, count)| SummaryRow { category, count })
        .collect::<Vec<_>>();
    tidy_data.sort_by_key(|data| data.category);

    serde_json::to_writer(std::io::stdout(), &json!({
        "summary": tidy_data,
        "meta": { "count": COUNT, "duration_ms": start.elapsed().as_millis() },
    })).unwrap();
}

// Here, we create types for the domain model of a poker hand. Working with
// specific types helps makes the rest of the code simpler.

#[derive(Debug, Clone, Serialize)]
struct SummaryRow {
    category: HandCategory,
    count: u32,
}

#[derive(Debug, PartialEq, Clone, Serialize)]
struct Hand(Vec<Card>);

#[derive(Debug, PartialEq, Clone, Copy, Serialize)]
struct Card {
    /// 1 is an Ace, 2-10 are the numbered cards, 11 is Jack, 12 is Queen, 13 is King.
    rank: u8,
    suit: Suit,
}

#[derive(Debug, PartialEq, Eq, Clone, Copy, Serialize, Hash)]
enum Suit {
    Clubs,
    Diamonds,
    Hearts,
    Spades,
}

#[derive(Debug, PartialEq, Eq, PartialOrd, Ord, Hash, Clone, Copy, Serialize)]
enum HandCategory {
    HighCard,
    OnePair,
    TwoPair,
    ThreeOfAKind,
    Straight,
    Flush,
    FullHouse,
    FourOfAKind,
    StraightFlush,
}

// With the data domain specified, we can write the logic to generate hands and categorize them.

impl Hand {
    /// Generate a random 5 card hand
    fn random() -> Self {
        let mut rng = rand::thread_rng();
        let mut cards = Vec::with_capacity(5);
        while cards.len() < 5 {
            let rank = rng.gen_range(1..=13);
            let suit = match rng.gen_range(0..4) {
                0 => Suit::Clubs,
                1 => Suit::Diamonds,
                2 => Suit::Hearts,
                3 => Suit::Spades,
                _ => unreachable!(),
            };
            let card = Card { rank, suit };
            if cards.iter().any(|&c| c == card) { continue };
            cards.push(card);
        }
        Self(cards)
    }

    fn categorize(&self) -> HandCategory {
        let rank_counts = self.0.iter().fold(HashMap::new(), |mut acc, card| {
            *acc.entry(card.rank).or_insert(0) += 1;
            acc
        });
        let suit_counts = self.0.iter().fold(HashMap::new(), |mut acc, card| {
            *acc.entry(card.suit).or_insert(0) += 1;
            acc
        });
        let is_flush = suit_counts.len() == 1;
        let is_straight = if self.0.iter().any(|card| card.rank == 1) {
            // Handle aces
            let min_rank = self.0.iter().map(|card| card.rank).filter(|&rank| rank != 1).min().unwrap();
            let max_rank = self.0.iter().map(|card| card.rank).filter(|&rank| rank != 1).max().unwrap();
            (min_rank == 2 && max_rank == 5) || (min_rank == 10 && max_rank == 13)
        } else {
            let min_rank = self.0.iter().map(|card| card.rank).min().unwrap();
            let max_rank = self.0.iter().map(|card| card.rank).max().unwrap();
            (max_rank - min_rank) as usize == self.0.len() - 1
        };

        if is_flush && is_straight {
            HandCategory::StraightFlush
        } else if rank_counts.values().any(|&count| count == 4) {
            HandCategory::FourOfAKind
        } else if rank_counts.values().any(|&count| count == 3)
            && rank_counts.values().any(|&count| count == 2)
        {
            HandCategory::FullHouse
        } else if is_flush {
            HandCategory::Flush
        } else if is_straight {
            HandCategory::Straight
        } else if rank_counts.values().any(|&count| count == 3) {
            HandCategory::ThreeOfAKind
        } else if rank_counts.values().filter(|&&count| count == 2).count() == 2 {
            HandCategory::TwoPair
        } else if rank_counts.values().any(|&count| count == 2) {
            HandCategory::OnePair
        } else {
            HandCategory::HighCard
        }
    }
}
