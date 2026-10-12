// Bankroll + bet sizing. Bet can only be changed between hands so players can
// practice correlating wager size to the True Count (paper trading).
const CHIPS = [5, 25, 100, 500];

export default function BankrollBar({ bankroll, bet, setBet, phase, PHASE, minBet, trueCount, accuracy, stats, onReset }) {
  const canBet = phase === PHASE.BETTING;
  const clamp = (v) => Math.max(minBet, Math.min(v, bankroll));

  return (
    <div className="bg-black/25 rounded-xl p-3 text-white">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/60">Bankroll</div>
          <div className="text-2xl font-bold text-emerald-300">${bankroll.toFixed(0)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-white/60">Accuracy</div>
          <div className="text-2xl font-bold text-yellow-300">
            {accuracy == null ? '—' : `${accuracy}%`}
          </div>
          <div className="text-[10px] text-white/50">{stats.total} graded</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] uppercase tracking-wider text-white/60">Bet</span>
        <span className="text-lg font-bold text-amber-200">${bet}</span>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-2">
        {CHIPS.map((c) => (
          <button
            key={c}
            disabled={!canBet}
            onClick={() => setBet((b) => clamp(b + c))}
            className="py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-sm font-semibold"
          >
            +{c}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          disabled={!canBet}
          onClick={() => setBet(minBet)}
          className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-xs"
        >
          Clear
        </button>
        <button
          onClick={onReset}
          className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs"
        >
          Reset Bankroll
        </button>
      </div>

      {canBet && (
        <p className="text-[11px] text-white/55 mt-2">
          True count is <b className="text-yellow-200">{trueCount > 0 ? `+${trueCount}` : trueCount}</b>.
          {trueCount >= 2
            ? ' Counts favor the player — a bigger bet has positive expectation.'
            : ' Neutral or negative count — keep the bet at the minimum.'}
        </p>
      )}
    </div>
  );
}
