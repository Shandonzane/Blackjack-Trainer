# Blackjack Trainer · By the Book

An educational blackjack trainer for learning **basic strategy**, **Hi-Lo card
counting**, and **bankroll / bet-sizing** discipline. It is a teaching tool, not
a gambling app — there is no real money and no "house" beyond honest dealer play.

## Two ways to run it

### 1. Zero install (recommended for a quick look)
Just open **`standalone.html`** in any modern browser (double-click it). It pulls
React, Tailwind, and an in-browser Babel transformer from CDNs and runs the whole
app from that single file. No Node, no build step.

> Needs an internet connection the first time (for the CDN scripts).

### 2. Vite dev project (for editing the separated source)
Requires [Node.js](https://nodejs.org/) (18+). From this folder:

```bash
npm install
npm run dev      # starts the dev server and opens the app
npm run build    # production build into dist/
```

## Architecture

Game logic is fully separated from the view layer.

| File | Role |
|------|------|
| `src/engine/DeckEngine.js` | Cards, multi-deck shoe, Fisher-Yates shuffle, hand-value math, Hi-Lo values, true-count / penetration helpers. Pure, no React. |
| `src/engine/StrategyMatrix.js` | The "by the book" brain. Comprehensive **data objects** (hard / soft / pairs) of strategy codes; `buildStrategy(rules)` resolves them for the active casino rules; `getOptimalMove()` returns the move **and** a written explanation. |
| `src/engine/useGame.js` | The **UIController** — a React hook holding the full state machine (deal → player → dealer → settle), counting, payouts, quiz grading, and reshuffle logic. |
| `src/components/*` | Presentational components: `Card`, `Hand`, `CountDisplay`, `SettingsPanel`, `BankrollBar`, `Controls`, `Feedback`, `Modal`, `StrategyChart`, `ReviewPanel`. |
| `src/App.jsx` | Composition root — wires the controller into the components. |
| `standalone.html` | Single-file port of all of the above for no-build use. |

## Features

- **Settings modal** (⚙️ button): all casino rules live behind one window and
  live-rewrite the strategy matrix and chart:
  - Dealer **H17 / S17** (hits vs stands on soft 17).
  - **DAS** (double after split) on/off.
  - **Late surrender** on/off.
  - **Shoe size**: 1 / 2 / 6 / 8 decks.
  - **"No-bust"** strategy variation (never hit a hard 12–16).
  - **Show betting & bankroll** — turn the money UI off to drill pure strategy.
  - **Defaults** match common large-Oklahoma-casino (WinStar) main tables:
    **8 decks, H17, DAS, no surrender, 3:2 blackjack**.
- **Learning / Quiz toggle on the main page** (not buried in settings).
- **Learning mode**: shows the optimal move + reasoning before you act.
- **Quiz mode**: hides the answer, grades each decision, tracks running
  **accuracy %**, and on a wrong move **freezes** the game with a specific
  explanation of the correct play for that exact hand vs. upcard.
- **Review (📝)**: logs every Quiz mistake, ranked most-missed first
  (e.g. "Hard 15 vs 6 — should Stand"), and a one-click **Practice** drill that
  deals that exact scenario on repeat until you've got it.
- **Strategy Chart (📊)**: a color-coded, by-the-book hard/soft/pairs chart that
  reflects the active rule toggles.
- **Card counting**: real-time Hi-Lo **running count** and dynamically computed
  **true count**, decks-remaining, and a penetration bar with a **75% cut card**
  that triggers a reshuffle.
- **Paper trading**: a $1,000 virtual bankroll with adjustable bet sizing
  between hands, so you can practice correlating wager size to the true count.

## Strategy code legend (StrategyMatrix.js)

`H` hit · `S` stand · `D` double else hit · `Ds` double else stand · `P` split ·
`Ph` split if DAS else hit · `Rh`/`Rs`/`Rp` surrender (else hit/stand/split).

These codes are resolved into concrete moves at lookup time based on the live
hand and the active rules.
