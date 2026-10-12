// =============================================================================
// App.jsx — composition root / view layer.
// Wires the useGame controller into the visual components. All game logic
// lives in src/engine; this file is layout + prop plumbing + modal state.
// =============================================================================
import { useState } from 'react';
import { useGame } from './engine/useGame.js';
import Hand from './components/Hand.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import CountDisplay from './components/CountDisplay.jsx';
import BankrollBar from './components/BankrollBar.jsx';
import Controls from './components/Controls.jsx';
import Feedback from './components/Feedback.jsx';
import Modal from './components/Modal.jsx';
import StrategyChart from './components/StrategyChart.jsx';
import ReviewPanel from './components/ReviewPanel.jsx';

export default function App() {
  const g = useGame();
  const { PHASE } = g;

  // Which overlay (if any) is open.
  const [modal, setModal] = useState(null); // 'settings' | 'chart' | 'review' | null
  const close = () => setModal(null);

  const practiceFromReview = (miss) => {
    g.startPractice(miss);
    close();
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-emerald-800 to-emerald-950 text-white">
      <div className="max-w-5xl mx-auto px-3 py-4">
        {/* ---- Header ---- */}
        <header className="mb-4">
          <div className="text-center mb-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Blackjack Trainer <span className="text-yellow-300">· By the Book</span>
            </h1>
            <p className="text-xs text-white/60">Basic strategy · Hi-Lo counting · bankroll & bet-sizing practice</p>
          </div>

          {/* Mode toggle stays on the main page; tools open as modals. */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex rounded-xl bg-black/25 p-1">
              <ModeBtn active={g.mode === 'learn'} onClick={() => g.setMode('learn')}>Learning</ModeBtn>
              <ModeBtn active={g.mode === 'quiz'} onClick={() => g.setMode('quiz')}>Quiz</ModeBtn>
            </div>
            <ToolBtn onClick={() => setModal('chart')}>📊 Strategy Chart</ToolBtn>
            <ToolBtn onClick={() => setModal('review')}>
              📝 Review{g.missList.length > 0 ? ` (${g.missList.length})` : ''}
            </ToolBtn>
            <ToolBtn onClick={() => setModal('settings')}>⚙️ Settings</ToolBtn>
          </div>
        </header>

        {/* ---- Practice banner ---- */}
        {g.practice && (
          <div className="mb-3 flex items-center justify-between gap-3 bg-yellow-300/15 border border-yellow-300/40 rounded-xl px-4 py-2">
            <span className="text-sm text-yellow-100">
              🎯 Practicing <b>{g.practice.label}</b> — book play is <b>{g.practice.correctMove}</b>.
            </span>
            <button
              onClick={g.exitPractice}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20"
            >
              Exit drill
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_320px] gap-4">
          {/* ---- Table ---- */}
          <main className="order-2 lg:order-1">
            <div className="bg-emerald-700/40 rounded-2xl border border-emerald-400/20 p-4 shadow-xl">
              <Hand label="Dealer" cards={g.dealer.cards} hideHole={g.dealer.hideHole} />

              <div className="my-4 border-t border-dashed border-white/15" />

              {g.playerHands.length === 0 ? (
                <div className="text-center text-white/50 py-8 text-sm">
                  Press <b className="text-yellow-300">Deal</b> to start a hand.
                </div>
              ) : (
                <div className={`grid gap-3 ${g.playerHands.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
                  {g.playerHands.map((h, i) => (
                    <Hand
                      key={h.id}
                      label={g.playerHands.length > 1 ? `Your hand ${i + 1}` : 'Your hand'}
                      cards={h.cards}
                      active={g.phase === PHASE.PLAYER && i === g.activeIndex}
                      result={g.phase === PHASE.SETTLE ? h.result : null}
                      bet={g.rules.showBankroll ? h.bet : null}
                      doubled={h.doubled}
                    />
                  ))}
                </div>
              )}

              <div className="mt-4 text-center text-sm text-white/80 min-h-[20px]">{g.message}</div>

              <div className="mt-4">
                <Controls
                  phase={g.phase}
                  PHASE={PHASE}
                  legalActions={g.legalActions}
                  requestAction={g.requestAction}
                  deal={g.deal}
                  nextRound={g.nextRound}
                  mode={g.mode}
                  liveHint={g.liveHint}
                  bankroll={g.bankroll}
                  minBet={g.MIN_BET}
                  showMoney={g.rules.showBankroll}
                />
              </div>
            </div>
          </main>

          {/* ---- Sidebar ---- */}
          <aside className="order-1 lg:order-2 space-y-3">
            {g.rules.showBankroll && (
              <BankrollBar
                bankroll={g.bankroll}
                bet={g.bet}
                setBet={g.setBet}
                phase={g.phase}
                PHASE={PHASE}
                minBet={g.MIN_BET}
                trueCount={g.trueCount}
                accuracy={g.accuracy}
                stats={g.stats}
                onReset={g.resetBankroll}
              />
            )}
            {/* Accuracy still matters when bankroll is hidden. */}
            {!g.rules.showBankroll && (
              <div className="bg-black/25 rounded-xl p-3 text-white flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-white/60">Accuracy</div>
                  <div className="text-2xl font-bold text-yellow-300">
                    {g.accuracy == null ? '—' : `${g.accuracy}%`}
                  </div>
                  <div className="text-[10px] text-white/50">{g.stats.total} graded</div>
                </div>
                <button onClick={g.resetBankroll} className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20">
                  Reset stats
                </button>
              </div>
            )}
            <CountDisplay
              runningCount={g.runningCount}
              trueCount={g.trueCount}
              decksLeft={g.decksLeft}
              shoe={g.shoe}
            />
          </aside>
        </div>

        <footer className="text-center text-[11px] text-white/40 mt-6 pb-4">
          Educational tool — practice only. Strategy adapts live to the casino-rule toggles.
        </footer>
      </div>

      {/* ---- Overlays ---- */}
      <Feedback feedback={g.feedback} onAck={g.acknowledgeFeedback} />

      <Modal open={modal === 'settings'} title="Settings & Casino Rules" onClose={close}>
        <SettingsPanel rules={g.rules} updateRule={g.updateRule} />
      </Modal>

      <Modal open={modal === 'chart'} title="Basic Strategy Chart" onClose={close} maxWidth="max-w-2xl">
        <StrategyChart strategy={g.strategy} rules={g.rules} />
      </Modal>

      <Modal open={modal === 'review'} title="Review · Your Mistakes" onClose={close} maxWidth="max-w-xl">
        <ReviewPanel missList={g.missList} onPractice={practiceFromReview} onClear={g.clearMisses} />
      </Modal>
    </div>
  );
}

function ModeBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
        active ? 'bg-yellow-300 text-emerald-950' : 'text-white/80 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function ToolBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-xl bg-black/25 hover:bg-black/40 text-sm font-semibold text-white/90"
    >
      {children}
    </button>
  );
}
