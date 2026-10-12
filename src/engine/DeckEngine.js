// =============================================================================
// DeckEngine.js
// -----------------------------------------------------------------------------
// Pure, framework-agnostic blackjack card + shoe logic. No React in here.
//   - Builds a multi-deck shoe and shuffles it (Fisher-Yates).
//   - Tracks deck penetration / the cut card (reshuffle trigger).
//   - Computes hand values (with soft-ace handling) and pair/blackjack flags.
//   - Provides the Hi-Lo counting value for a card.
// =============================================================================

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS = ['♠', '♥', '♦', '♣'];

// Where the cut card sits. 0.75 => reshuffle once 75% of the shoe is dealt.
export const PENETRATION = 0.75;

/**
 * The blackjack point value of a rank. Aces count as 11 here; soft/hard
 * reduction is handled in handValue().
 */
export function cardValue(rank) {
  if (rank === 'A') return 11;
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10;
  return parseInt(rank, 10);
}

/**
 * Hi-Lo running-count contribution for a single card.
 *   2-6  => +1   (low cards good for the player when gone)
 *   7-9  =>  0   (neutral)
 *   10-A => -1   (high cards / aces)
 */
export function hiLoValue(rank) {
  const v = cardValue(rank);
  if (v >= 2 && v <= 6) return +1;
  if (v >= 10 || rank === 'A') return -1; // 10,J,Q,K and Ace
  return 0; // 7,8,9
}

/** Create a single 52-card deck, tagging each card with a stable id. */
function buildDeck(deckIndex) {
  const cards = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({
        rank,
        suit,
        value: cardValue(rank),
        hiLo: hiLoValue(rank),
        red: suit === '♥' || suit === '♦',
        id: `${deckIndex}-${rank}${suit}`,
      });
    }
  }
  return cards;
}

/** Fisher-Yates in-place shuffle. */
export function shuffle(cards) {
  const a = cards.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build and shuffle a fresh shoe of `numDecks` decks.
 * Returns { cards, total, cutCard } where cutCard is the index at which
 * penetration is reached (used to flag a reshuffle).
 */
export function createShoe(numDecks) {
  let cards = [];
  for (let d = 0; d < numDecks; d++) cards = cards.concat(buildDeck(d));
  cards = shuffle(cards);
  const total = cards.length;
  return {
    cards,
    total,
    dealt: 0,
    cutCard: Math.floor(total * PENETRATION),
  };
}

/**
 * Compute the best value of a hand of cards.
 * Returns { total, soft, isBust, isPair, isBlackjack }.
 *   - soft: true when an ace is still counted as 11.
 *   - isBlackjack: exactly two cards totalling 21.
 */
export function handValue(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += c.value;
    if (c.rank === 'A') aces += 1;
  }
  // Demote aces from 11 to 1 while we're over 21.
  let softAces = aces;
  while (total > 21 && softAces > 0) {
    total -= 10;
    softAces -= 1;
  }
  const soft = softAces > 0; // an ace is still worth 11
  const isPair = cards.length === 2 && cards[0].value === cards[1].value;
  const isBlackjack = cards.length === 2 && total === 21;
  return { total, soft, isBust: total > 21, isPair, isBlackjack };
}

/** Decks remaining in the shoe, used for the True Count calculation. */
export function decksRemaining(shoe) {
  const remaining = shoe.total - shoe.dealt;
  return remaining / 52;
}

/**
 * True Count = running count / decks remaining.
 * We clamp the divisor so a nearly-empty shoe doesn't explode the number,
 * and round to one decimal place for display.
 */
export function trueCount(runningCount, shoe) {
  const decks = Math.max(decksRemaining(shoe), 0.5);
  return Math.round((runningCount / decks) * 10) / 10;
}
