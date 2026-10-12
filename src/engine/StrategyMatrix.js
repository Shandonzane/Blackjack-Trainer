// =============================================================================
// StrategyMatrix.js
// -----------------------------------------------------------------------------
// The "by the book" basic-strategy brain.
//
// Strategy is stored as comprehensive DATA OBJECTS (hard totals, soft totals,
// pairs) keyed by [player total/pair] -> [dealer upcard 2..11], where 11 = Ace.
// Each cell holds a short CODE. buildStrategy(rules) resolves those codes into
// concrete moves for the active casino rules (H17/S17, DAS, surrender, decks,
// and the optional "no-bust" variation).
//
// Codes:
//   H   = Hit
//   S   = Stand
//   D   = Double if allowed, otherwise Hit
//   Ds  = Double if allowed, otherwise Stand
//   P   = Split
//   Ph  = Split if DAS allowed, otherwise Hit
//   Rh  = Surrender if allowed, otherwise Hit
//   Rs  = Surrender if allowed, otherwise Stand
//   Rp  = Surrender (vs Ace) if allowed, otherwise Split
//
// Resolved moves returned to the UI: 'hit' | 'stand' | 'double' | 'split' |
// 'surrender'.
// =============================================================================

import { handValue } from './DeckEngine.js';

// Dealer upcard columns, in matrix order.
export const DEALER_COLS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // 11 = Ace

// Helper to turn a per-upcard array (length 10) into a keyed object.
const row = (...codes) => {
  const o = {};
  DEALER_COLS.forEach((c, i) => (o[c] = codes[i]));
  return o;
};

// ---------------------------------------------------------------------------
// BASE TABLES (S17 reference; H17 deltas applied in buildStrategy).
// ---------------------------------------------------------------------------

// Hard totals 5..21 (no usable ace, not a pair).
const HARD = {
  //          2    3    4    5    6    7    8    9   10    A
  5:  row('H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'),
  6:  row('H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'),
  7:  row('H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'),
  8:  row('H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'),
  9:  row('H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'),
  10: row('D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'),
  11: row('D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H'), // 11 vs A -> D under H17
  12: row('H', 'H', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'),
  13: row('S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'),
  14: row('S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'),
  15: row('S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'Rh', 'H'), // 15 vs A -> Rh under H17
  16: row('S', 'S', 'S', 'S', 'S', 'H', 'H', 'Rh', 'Rh', 'Rh'),
  17: row('S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'),
  18: row('S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'),
  19: row('S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'),
  20: row('S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'),
  21: row('S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'),
};

// Soft totals: keyed by the full hand total (A + other). A,2 = 13 ... A,9 = 20.
const SOFT = {
  //          2     3     4     5     6     7    8    9   10    A
  13: row('H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H', 'H'), // A,2
  14: row('H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H', 'H'), // A,3
  15: row('H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'), // A,4
  16: row('H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'), // A,5
  17: row('H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'), // A,6
  18: row('S', 'Ds', 'Ds', 'Ds', 'Ds', 'S', 'S', 'H', 'H', 'H'), // A,7 (2 -> Ds under H17)
  19: row('S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'),     // A,8 (6 -> Ds under H17)
  20: row('S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'),     // A,9
  21: row('S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'),
};

// Pairs: keyed by the single-card value of the pair. 11 = pair of Aces.
const PAIRS = {
  //          2     3     4    5    6     7    8    9   10    A
  2:  row('Ph', 'Ph', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'),
  3:  row('Ph', 'Ph', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'),
  4:  row('H', 'H', 'H', 'Ph', 'Ph', 'H', 'H', 'H', 'H', 'H'),
  5:  row('D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'), // never split — play as hard 10
  6:  row('Ph', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H', 'H'),
  7:  row('P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'),
  8:  row('P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'), // 8,8 vs A -> Rp under H17
  9:  row('P', 'P', 'P', 'P', 'P', 'S', 'P', 'P', 'S', 'S'),
  10: row('S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'),
  11: row('P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'),
};

// Deep clone so we never mutate the base tables when applying rule deltas.
const clone = (obj) => JSON.parse(JSON.stringify(obj));

/**
 * buildStrategy(rules)
 * Returns a resolved strategy data object: { hard, soft, pairs } with rule
 * deltas baked in (H17 changes, no-bust variation). DAS / surrender / double
 * availability are resolved per-hand at lookup time because they depend on the
 * live hand state, not just the rules.
 */
export function buildStrategy(rules) {
  const hard = clone(HARD);
  const soft = clone(SOFT);
  const pairs = clone(PAIRS);

  if (rules.h17) {
    // Dealer hits soft 17 — a handful of cells shift toward the player.
    hard[11][11] = 'D';   // 11 vs A: double
    hard[15][11] = 'Rh';  // 15 vs A: surrender
    hard[17][11] = 'S';   // 17 vs A: stand (unchanged, kept explicit)
    soft[18][2] = 'Ds';   // A,7 vs 2: double/stand
    soft[19][6] = 'Ds';   // A,8 vs 6: double/stand
    pairs[8][11] = 'Rp';  // 8,8 vs A: surrender if allowed, else split
  } else {
    // S17 — dealer stands on soft 17. Undo the player-favourable Ace cells.
    hard[11][11] = 'H';   // 11 vs A: hit
    hard[15][11] = 'H';   // 15 vs A: hit
  }

  if (rules.noBust) {
    // "No-bust" teaching variation: never voluntarily take a card that could
    // bust a hard total. Stand on every hard 12+ regardless of the dealer.
    for (let t = 12; t <= 16; t++) {
      DEALER_COLS.forEach((c) => {
        hard[t][c] = 'S';
      });
    }
  }

  return { hard, soft, pairs, rules };
}

/**
 * canDouble / canSplit / canSurrender: availability helpers based on the live
 * hand and rules. `hand` carries flags set by the controller.
 */
function canDouble(hand, rules) {
  if (hand.cards.length !== 2) return false;
  // After a split, doubling requires DAS (except you can never double split aces).
  if (hand.fromSplit) {
    if (hand.splitAces) return false;
    return rules.das;
  }
  return true;
}
function canSplit(hand) {
  return hand.cards.length === 2 && hand.cards[0].value === hand.cards[1].value;
}
function canSurrender(hand, rules) {
  // Late surrender: only on the original two cards, never after a split or hit.
  return rules.surrender && hand.cards.length === 2 && !hand.fromSplit;
}

/**
 * Resolve a strategy CODE into a concrete move given the live hand + rules.
 */
function resolveCode(code, hand, rules) {
  switch (code) {
    case 'H':
      return 'hit';
    case 'S':
      return 'stand';
    case 'D':
      return canDouble(hand, rules) ? 'double' : 'hit';
    case 'Ds':
      return canDouble(hand, rules) ? 'double' : 'stand';
    case 'P':
      return 'split';
    case 'Ph':
      return rules.das ? 'split' : 'hit';
    case 'Rh':
      return canSurrender(hand, rules) ? 'surrender' : 'hit';
    case 'Rs':
      return canSurrender(hand, rules) ? 'surrender' : 'stand';
    case 'Rp':
      return canSurrender(hand, rules) ? 'surrender' : 'split';
    default:
      return 'stand';
  }
}

/**
 * getOptimalMove(hand, dealerUpcard, strategy)
 * The main lookup the controller calls. Returns:
 *   { move, code, category, playerLabel, dealerLabel, explanation }
 *
 *   hand          : { cards: [...], fromSplit, splitAces }
 *   dealerUpcard  : a card object (the dealer's exposed card)
 *   strategy      : the object returned by buildStrategy()
 */
export function getOptimalMove(hand, dealerUpcard, strategy) {
  const { rules } = strategy;
  const { total, soft, isPair } = handValue(hand.cards);
  // Dealer's effective column (Ace => 11).
  const dCol = dealerUpcard.rank === 'A' ? 11 : Math.min(dealerUpcard.value, 10);
  const dealerLabel = dealerUpcard.rank === 'A' ? 'Ace' : String(Math.min(dealerUpcard.value, 10));

  let code;
  let category;
  let playerLabel;

  // Pairs first — but a pair can only be split on the first two cards.
  if (isPair && canSplit(hand)) {
    const pv = hand.cards[0].value; // 2..11
    code = strategy.pairs[pv][dCol];
    category = 'pair';
    const name = pv === 11 ? 'Aces' : `${pv}s`;
    playerLabel = `a pair of ${name}`;
  } else if (soft && total <= 21) {
    code = (strategy.soft[total] || strategy.hard[Math.min(total, 21)])[dCol];
    category = 'soft';
    playerLabel = `soft ${total}`;
  } else {
    const t = Math.max(5, Math.min(total, 21));
    code = strategy.hard[t][dCol];
    category = 'hard';
    playerLabel = `hard ${total}`;
  }

  const move = resolveCode(code, hand, rules);
  const explanation = buildExplanation({
    move,
    code,
    category,
    playerLabel,
    dealerLabel,
    total,
    rules,
  });

  return { move, code, category, playerLabel, dealerLabel, explanation };
}

// Human-readable verb for each move.
const MOVE_VERB = {
  hit: 'Hit',
  stand: 'Stand',
  double: 'Double Down',
  split: 'Split',
  surrender: 'Surrender',
};

export function moveLabel(move) {
  return MOVE_VERB[move] || move;
}

/**
 * resolveChartCell — for the printable strategy chart. Turns a raw cell CODE
 * into a short display label + a "kind" used for colour-coding, honouring the
 * DAS / surrender toggles (H17 / no-bust are already baked into the tables by
 * buildStrategy). Assumes a fresh two-card hand (so D/Ds are shown as doubles).
 */
export function resolveChartCell(code, rules) {
  switch (code) {
    case 'H': return { label: 'H', kind: 'hit' };
    case 'S': return { label: 'S', kind: 'stand' };
    case 'D': return { label: 'D', kind: 'double' };
    case 'Ds': return { label: 'Ds', kind: 'double' };
    case 'P': return { label: 'P', kind: 'split' };
    case 'Ph': return rules.das ? { label: 'P', kind: 'split' } : { label: 'H', kind: 'hit' };
    case 'Rh': return rules.surrender ? { label: 'SUR', kind: 'surrender' } : { label: 'H', kind: 'hit' };
    case 'Rs': return rules.surrender ? { label: 'SUR', kind: 'surrender' } : { label: 'S', kind: 'stand' };
    case 'Rp': return rules.surrender ? { label: 'SUR', kind: 'surrender' } : { label: 'P', kind: 'split' };
    default: return { label: code, kind: 'stand' };
  }
}

// Row definitions for the chart (which totals/pairs to display).
export const CHART_ROWS = {
  hard: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
  soft: [13, 14, 15, 16, 17, 18, 19, 20], // A,2 .. A,9
  pairs: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // 2,2 .. A,A
};

// Pretty row labels.
export function chartRowLabel(section, key) {
  if (section === 'hard') return String(key);
  if (section === 'soft') return `A,${key - 11}`;
  // pairs
  return key === 11 ? 'A,A' : `${key},${key}`;
}

// Pretty dealer column label.
export function chartColLabel(col) {
  return col === 11 ? 'A' : String(col);
}

/**
 * buildExplanation — produces specific, teachable text for the recommended
 * play. Combines a "headline" (the move) with the reasoning behind it.
 */
function buildExplanation({ move, code, category, playerLabel, dealerLabel, total, rules }) {
  const head = `With ${playerLabel} against a dealer ${dealerLabel}, the book play is to ${MOVE_VERB[move]}.`;
  let why = '';

  // Dealer "weak" upcards are 2-6 (most likely to bust); "strong" are 7-A.
  const dealerWeak = dealerLabel !== 'Ace' && Number(dealerLabel) >= 2 && Number(dealerLabel) <= 6;

  if (rules.noBust && category === 'hard' && total >= 12 && total <= 16 && move === 'stand') {
    why =
      'Under the "no-bust" variation you never take a card that could bust a hard 12–16. ' +
      'This is intentionally conservative and gives up some EV versus classic basic strategy — ' +
      'it lets the dealer do the busting for you.';
    return `${head} ${why}`;
  }

  switch (move) {
    case 'double':
      why = dealerWeak
        ? `The dealer is weak (likely to bust on ${dealerLabel}), and your hand is strong enough to want more money out when you'll most often improve to a winner.`
        : `Your starting total has a strong expectation here, so getting extra money out on a single card is worth more than the risk of a bad draw.`;
      break;
    case 'split':
      if (code === 'P' || code === 'Ph' || code === 'Rp') {
        why =
          playerLabel.includes('Aces')
            ? 'Splitting Aces turns one mediocre hand into two hands each starting with 11 — far too valuable to pass up (you only get one card on each).'
            : playerLabel.includes('8s')
            ? '16 is the worst hand in blackjack; splitting 8s breaks it into two fresh hands each starting at 8, which is strictly better.'
            : `Splitting here gives you two hands with a better expectation than the single combined total, especially against the dealer's ${dealerLabel}.`;
      }
      break;
    case 'surrender':
      why = `You're a statistical underdog with ${playerLabel} versus a ${dealerLabel}. Late surrender forfeits half the bet, which loses less in the long run than playing the hand out.`;
      break;
    case 'stand':
      why = dealerWeak
        ? `The dealer is likely to bust showing a ${dealerLabel}, so don't risk busting yourself — let them take the cards.`
        : `Hitting risks busting more often than it improves the hand here, so standing is the lower-loss play.`;
      break;
    case 'hit':
    default:
      why = dealerWeak
        ? `Even though the dealer is weak, your total is low enough that standing would just hand them the pot — take a card.`
        : `The dealer's ${dealerLabel} is strong, so you must improve your total rather than stand on a likely loser.`;
      break;
  }

  return `${head} ${why}`;
}
