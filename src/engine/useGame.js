// =============================================================================
// useGame.js  (the UIController)
// -----------------------------------------------------------------------------
// The state machine that drives a hand of blackjack. Wraps DeckEngine +
// StrategyMatrix into a single React hook the UI components consume.
//
// Responsibilities:
//   - Hold game state (shoe, hands, dealer, bankroll, bet, count, stats, phase).
//   - Deal, and run player actions (hit/stand/double/split/surrender).
//   - Run the dealer per H17/S17 and settle payouts.
//   - Maintain the Hi-Lo running count + true count as cards are exposed.
//   - In Quiz mode: grade each decision, freeze on a wrong move, surface the
//     specific correct play, track running accuracy, and LOG each mistake so
//     Review/Practice can target the player's weakest spots.
//   - Practice mode: deal a forced scenario (e.g. hard 15 vs 6) on repeat.
//   - Reshuffle when the cut card (75% penetration) is reached.
//
// Design note: the shoe and running count are held in REFS as the single
// source of truth so that every closure (deal, hit, dealer-draw) reads/writes
// the same up-to-date deck position regardless of React's render timing.
// =============================================================================

import { useState, useRef, useCallback, useMemo } from 'react';
import {
  createShoe,
  handValue,
  decksRemaining,
  trueCount as calcTrueCount,
  cardValue,
  hiLoValue,
  SUITS,
} from './DeckEngine.js';
import { buildStrategy, getOptimalMove, moveLabel } from './StrategyMatrix.js';

// Phases of a round.
export const PHASE = {
  BETTING: 'betting',
  PLAYER: 'player',
  DEALER: 'dealer',
  SETTLE: 'settle',
};

// Defaults tuned to common large-Oklahoma-casino (e.g. WinStar) main tables:
// 8 decks, dealer hits soft 17, double after split allowed, NO surrender,
// blackjack pays 3:2 (the payout the engine already uses).
export const DEFAULT_RULES = {
  h17: true,           // dealer hits soft 17
  das: true,           // double after split allowed
  surrender: false,    // late surrender NOT offered
  decks: 8,            // 8-deck shoe
  noBust: false,       // "no-bust" teaching variation
  showBankroll: true,  // betting/bankroll UI visible
};

const STARTING_BANKROLL = 1000;
const MIN_BET = 5;

let HAND_SEQ = 0;
const newHand = (cards, bet, extra = {}) => ({
  id: ++HAND_SEQ,
  cards,
  bet,
  fromSplit: false,
  splitAces: false,
  doubled: false,
  surrendered: false,
  done: false,
  result: null,
  ...extra,
});

// Build a one-off card of a given rank (used to force Practice scenarios).
let SYNTH_SEQ = 0;
function makeCard(rank) {
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  return {
    rank,
    suit,
    value: cardValue(rank),
    hiLo: hiLoValue(rank),
    red: suit === '♥' || suit === '♦',
    id: `synth-${++SYNTH_SEQ}-${rank}${suit}`,
  };
}

export function useGame() {
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [mode, setMode] = useState('learn'); // 'learn' | 'quiz'

  // --- single source of truth (refs) ---
  const shoeRef = useRef(createShoe(DEFAULT_RULES.decks));
  const countRef = useRef(0);
  // --- render mirrors ---
  const [shoe, setShoeState] = useState(shoeRef.current);
  const [runningCount, setRunningCountState] = useState(0);

  const [phase, setPhase] = useState(PHASE.BETTING);
  const [playerHands, setPlayerHands] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dealer, setDealer] = useState({ cards: [], hideHole: true });

  const [bankroll, setBankroll] = useState(STARTING_BANKROLL);
  const [bet, setBet] = useState(25);

  const [stats, setStats] = useState({ correct: 0, total: 0 });
  const [feedback, setFeedback] = useState(null);
  const [message, setMessage] = useState('Set your bet and deal.');

  // Mistake log for Review/Practice. Keyed by scenario, e.g. "hard|15|6".
  const [misses, setMisses] = useState({});
  // When set, every deal forces this scenario. { category, playerRanks, dealerRank, key, label, correctMove }
  const [practice, setPractice] = useState(null);

  // Active strategy data object, rebuilt whenever the rules change.
  const strategy = useMemo(() => buildStrategy(rules), [rules]);

  // ---- counting helpers ---------------------------------------------------
  const trueCount = useMemo(() => calcTrueCount(runningCount, shoe), [runningCount, shoe]);
  const decksLeft = useMemo(() => Math.round(decksRemaining(shoe) * 10) / 10, [shoe]);
  const accuracy = stats.total === 0 ? null : Math.round((stats.correct / stats.total) * 100);

  // ---- low-level deck ops (operate on the refs) ---------------------------
  const addToCount = useCallback((cards) => {
    countRef.current += cards.reduce((s, c) => s + c.hiLo, 0);
    setRunningCountState(countRef.current);
  }, []);
  const drawCards = useCallback((n, { count = true } = {}) => {
    const s = shoeRef.current;
    const cards = s.cards.slice(s.dealt, s.dealt + n);
    shoeRef.current = { ...s, dealt: s.dealt + n };
    setShoeState(shoeRef.current);
    if (count) addToCount(cards);
    return cards;
  }, [addToCount]);
  const reshuffle = useCallback((decks) => {
    shoeRef.current = createShoe(decks);
    countRef.current = 0;
    setShoeState(shoeRef.current);
    setRunningCountState(0);
  }, []);

  // ---- rules / mode -------------------------------------------------------
  const updateRule = useCallback(
    (key, value) => {
      setRules((r) => ({ ...r, [key]: value }));
      if (key === 'decks') {
        reshuffle(value);
        setPhase(PHASE.BETTING);
        setPlayerHands([]);
        setDealer({ cards: [], hideHole: true });
        setFeedback(null);
        setMessage('New shoe loaded. Set your bet and deal.');
      }
    },
    [reshuffle]
  );

  // ---- settlement ---------------------------------------------------------
  const settlePayouts = useCallback((hands, dealerCardsArg, showMoney) => {
    setDealer((d) => {
      const dealerCards = dealerCardsArg || d.cards;
      const dv = handValue(dealerCards);
      const notes = [];
      const settled = hands.map((h) => {
        if (h.result === 'surrender') {
          setBankroll((b) => b + h.bet / 2);
          notes.push('surrender');
          return h;
        }
        const pv = handValue(h.cards);
        let result;
        let payout = 0;
        if (pv.isBust) result = 'lose';
        else if (dv.isBust || pv.total > dv.total) { result = 'win'; payout = h.bet * 2; }
        else if (pv.total < dv.total) result = 'lose';
        else { result = 'push'; payout = h.bet; }
        if (payout) setBankroll((b) => b + payout);
        notes.push(
          showMoney
            ? (result === 'win' ? `win $${h.bet}` : result === 'push' ? 'push' : `lose $${h.bet}`)
            : result
        );
        return { ...h, result };
      });
      setPlayerHands(settled);
      setPhase(PHASE.SETTLE);
      setMessage(`Dealer ${dv.isBust ? 'busts' : dv.total}. ${notes.join(' · ')}.`);
      return { cards: dealerCards, hideHole: false };
    });
  }, []);

  const revealHoleOnly = useCallback(() => {
    setDealer((d) => { addToCount([d.cards[1]]); return { ...d, hideHole: false }; });
  }, [addToCount]);

  const runDealer = useCallback(
    (hands) => {
      setDealer((d) => {
        const dealerCards = [...d.cards];
        addToCount([dealerCards[1]]);
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const hv = handValue(dealerCards);
          if (hv.total > 17) break;
          if (hv.total === 17 && !(hv.soft && rules.h17)) break;
          dealerCards.push(drawCards(1)[0]);
        }
        setTimeout(() => settlePayouts(hands, dealerCards, rules.showBankroll), 50);
        return { cards: dealerCards, hideHole: false };
      });
    },
    [addToCount, drawCards, rules.h17, rules.showBankroll, settlePayouts]
  );

  // ---- applying a player action ------------------------------------------
  const applyAction = useCallback(
    (action) => {
      setPlayerHands((prev) => {
        const hands = prev.map((h) => ({ ...h, cards: [...h.cards] }));
        const hand = hands[activeIndex];
        if (!hand || hand.done) return prev;

        if (action === 'hit') {
          hand.cards.push(drawCards(1)[0]);
          const hv = handValue(hand.cards);
          if (hv.isBust) { hand.done = true; hand.result = 'bust'; }
          else if (hv.total === 21) hand.done = true;
        } else if (action === 'stand') {
          hand.done = true;
        } else if (action === 'double') {
          setBankroll((b) => b - hand.bet);
          hand.bet *= 2;
          hand.doubled = true;
          hand.cards.push(drawCards(1)[0]);
          hand.done = true;
          if (handValue(hand.cards).isBust) hand.result = 'bust';
        } else if (action === 'surrender') {
          hand.surrendered = true;
          hand.done = true;
          hand.result = 'surrender';
        } else if (action === 'split') {
          setBankroll((b) => b - hand.bet);
          const isAces = hand.cards[0].rank === 'A';
          const handA = newHand([hand.cards[0], drawCards(1)[0]], hand.bet, { fromSplit: true, splitAces: isAces });
          const handB = newHand([hand.cards[1], drawCards(1)[0]], hand.bet, { fromSplit: true, splitAces: isAces });
          if (isAces) { handA.done = true; handB.done = true; }
          hands.splice(activeIndex, 1, handA, handB);
        }

        const firstUnfinished = hands.findIndex((h) => !h.done);
        if (firstUnfinished === -1) {
          const anyLive = hands.some((h) => h.result !== 'bust' && h.result !== 'surrender');
          setActiveIndex(0);
          if (anyLive) {
            setPhase(PHASE.DEALER);
            setTimeout(() => runDealer(hands), 350);
          } else {
            revealHoleOnly();
            setTimeout(() => settlePayouts(hands, null, rules.showBankroll), 50);
          }
        } else {
          setActiveIndex(firstUnfinished);
        }
        return hands;
      });
    },
    [activeIndex, drawCards, runDealer, revealHoleOnly, settlePayouts, rules.showBankroll]
  );

  // ---- decision grading (quiz mode) + mistake logging --------------------
  const recordMiss = useCallback((action, hand, optimal) => {
    const cat = optimal.category;
    const playerKey = cat === 'pair' ? hand.cards[0].value : handValue(hand.cards).total;
    const key = `${cat}|${playerKey}|${optimal.dealerLabel}`;
    setMisses((m) => {
      const prev = m[key] || {
        key,
        count: 0,
        category: cat,
        playerLabel: optimal.playerLabel,
        dealerLabel: optimal.dealerLabel,
        correctMove: optimal.move,
        explanation: optimal.explanation,
        scenario: {
          category: cat,
          playerRanks: hand.cards.slice(0, 2).map((c) => c.rank),
          dealerRank: dealer.cards[0].rank,
        },
        chosen: {},
      };
      return {
        ...m,
        [key]: {
          ...prev,
          count: prev.count + 1,
          correctMove: optimal.move,
          explanation: optimal.explanation,
          chosen: { ...prev.chosen, [action]: (prev.chosen[action] || 0) + 1 },
        },
      };
    });
  }, [dealer.cards]);

  const gradeDecision = useCallback(
    (action, hand) => {
      if (mode !== 'quiz') return true;
      const optimal = getOptimalMove(hand, dealer.cards[0], strategy);
      const correct = action === optimal.move;
      setStats((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
      if (correct) {
        setFeedback({ correct: true, text: `Correct — ${moveLabel(optimal.move)} is the book play.` });
        return true;
      }
      recordMiss(action, hand, optimal);
      setFeedback({ correct: false, text: optimal.explanation, chose: action, optimal: optimal.move, pending: action });
      return false;
    },
    [mode, dealer.cards, strategy, recordMiss]
  );

  const requestAction = useCallback(
    (action) => {
      if (phase !== PHASE.PLAYER) return;
      const hand = playerHands[activeIndex];
      if (!hand || hand.done) return;
      if (gradeDecision(action, hand)) applyAction(action);
    },
    [phase, playerHands, activeIndex, gradeDecision, applyAction]
  );

  const acknowledgeFeedback = useCallback(() => {
    const pending = feedback?.pending;
    setFeedback(null);
    if (pending) applyAction(pending);
  }, [feedback, applyAction]);

  // ---- dealing ------------------------------------------------------------
  const deal = useCallback(() => {
    if (phase !== PHASE.BETTING) return;
    const wager = Math.max(MIN_BET, Math.min(bet, bankroll));
    if (rules.showBankroll && bankroll < MIN_BET) {
      setMessage('Bankroll too low — reset to continue.');
      return;
    }

    if (shoeRef.current.dealt >= shoeRef.current.cutCard) {
      reshuffle(rules.decks);
      setMessage('Cut card reached — shuffled a fresh shoe.');
    }

    setFeedback(null);
    if (rules.showBankroll) setBankroll((b) => b - wager);

    // Player + dealer cards: forced for Practice, otherwise drawn from the shoe.
    let pCards, dCards;
    if (practice) {
      const p = practice.playerRanks.map(makeCard);
      addToCount(p);
      const du = makeCard(practice.dealerRank);
      addToCount([du]);
      const hole = drawCards(1, { count: false })[0];
      pCards = p;
      dCards = [du, hole];
    } else {
      const p1 = drawCards(1)[0];
      const d1 = drawCards(1)[0];
      const p2 = drawCards(1)[0];
      const d2 = drawCards(1, { count: false })[0];
      pCards = [p1, p2];
      dCards = [d1, d2];
    }

    const hand = newHand(pCards, wager);
    const playerBJ = handValue(pCards).isBlackjack;
    const dealerBJ = handValue(dCards).isBlackjack;

    if (playerBJ || dealerBJ) {
      addToCount([dCards[1]]);
      setDealer({ cards: dCards, hideHole: false });
      let result, payout, msg;
      if (playerBJ && dealerBJ) { result = 'push'; payout = wager; msg = 'Both have blackjack — push.'; }
      else if (playerBJ) { result = 'blackjack'; payout = wager + wager * 1.5; msg = 'Blackjack! Paid 3:2.'; }
      else { result = 'lose'; payout = 0; msg = 'Dealer has blackjack. You lose.'; }
      if (rules.showBankroll) setBankroll((b) => b + payout);
      setPlayerHands([{ ...hand, done: true, result }]);
      setPhase(PHASE.SETTLE);
      setMessage(msg);
      return;
    }

    setPlayerHands([hand]);
    setActiveIndex(0);
    setDealer({ cards: dCards, hideHole: true });
    setPhase(PHASE.PLAYER);
    setMessage(
      practice
        ? `Practicing: ${practice.label}. Choose your play.`
        : mode === 'learn'
        ? 'Learning mode: the recommended play is shown below.'
        : 'Quiz mode: choose your play.'
    );
  }, [phase, bet, bankroll, rules.decks, rules.showBankroll, reshuffle, drawCards, addToCount, mode, practice]);

  // ---- next round ---------------------------------------------------------
  const nextRound = useCallback(() => {
    setPlayerHands([]);
    setDealer({ cards: [], hideHole: true });
    setFeedback(null);
    setActiveIndex(0);
    setPhase(PHASE.BETTING);
    if (rules.showBankroll && bankroll < MIN_BET) {
      setMessage('Bankroll depleted — reset to keep practicing.');
    } else {
      setMessage(
        shoeRef.current.dealt >= shoeRef.current.cutCard
          ? 'Cut card reached — next deal reshuffles. Set your bet.'
          : practice
          ? `Practicing: ${practice.label}. Deal the next rep.`
          : 'Set your bet and deal.'
      );
    }
  }, [bankroll, rules.showBankroll, practice]);

  const resetBankroll = useCallback(() => {
    setBankroll(STARTING_BANKROLL);
    setStats({ correct: 0, total: 0 });
    setMessage('Bankroll and stats reset.');
  }, []);

  // ---- review / practice --------------------------------------------------
  // Misses sorted most-missed first.
  const missList = useMemo(
    () => Object.values(misses).sort((a, b) => b.count - a.count),
    [misses]
  );

  const startPractice = useCallback((miss) => {
    setPractice({
      category: miss.category,
      playerRanks: miss.scenario.playerRanks,
      dealerRank: miss.scenario.dealerRank,
      key: miss.key,
      correctMove: miss.correctMove,
      label: `${capitalize(miss.playerLabel)} vs ${miss.dealerLabel}`,
    });
    setMode('quiz');
    setPlayerHands([]);
    setDealer({ cards: [], hideHole: true });
    setFeedback(null);
    setPhase(PHASE.BETTING);
    setMessage('Practice drill loaded — Deal to begin.');
  }, []);

  const exitPractice = useCallback(() => {
    setPractice(null);
    setMessage('Practice ended. Set your bet and deal.');
  }, []);

  const clearMisses = useCallback(() => setMisses({}), []);

  // ---- live hint (learn mode) --------------------------------------------
  const liveHint = useMemo(() => {
    if (phase !== PHASE.PLAYER) return null;
    const hand = playerHands[activeIndex];
    if (!hand || hand.done || dealer.cards.length === 0) return null;
    return getOptimalMove(hand, dealer.cards[0], strategy);
  }, [phase, playerHands, activeIndex, dealer.cards, strategy]);

  const legalActions = useMemo(() => {
    const hand = playerHands[activeIndex];
    if (phase !== PHASE.PLAYER || !hand || hand.done) {
      return { hit: false, stand: false, double: false, split: false, surrender: false };
    }
    const twoCards = hand.cards.length === 2;
    const isPair = twoCards && hand.cards[0].value === hand.cards[1].value;
    const canAffordExtra = !rules.showBankroll || bankroll >= hand.bet;
    return {
      hit: !hand.splitAces,
      stand: true,
      double: twoCards && canAffordExtra && (!hand.fromSplit || rules.das) && !hand.splitAces,
      split: isPair && canAffordExtra && !hand.splitAces,
      surrender: rules.surrender && twoCards && !hand.fromSplit,
    };
  }, [phase, playerHands, activeIndex, bankroll, rules.das, rules.surrender, rules.showBankroll]);

  return {
    // state
    rules, mode, phase, playerHands, activeIndex, dealer,
    bankroll, bet, stats, accuracy, feedback, message,
    runningCount, trueCount, decksLeft, shoe,
    strategy, liveHint, legalActions,
    misses, missList, practice,
    // setters / actions
    setMode, setBet, updateRule,
    deal, requestAction, acknowledgeFeedback, nextRound, resetBankroll,
    startPractice, exitPractice, clearMisses,
    // constants
    PHASE, MIN_BET,
  };
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
