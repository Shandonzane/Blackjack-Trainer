import { moveLabel } from '../engine/StrategyMatrix.js';

// Action buttons (Hit/Stand/Double/Split/Surrender) plus Deal/Next, and the
// live hint shown in Learning mode.
export default function Controls({
  phase, PHASE, legalActions, requestAction, deal, nextRound,
  mode, liveHint, bankroll, minBet, showMoney = true,
}) {
  const broke = showMoney && bankroll < minBet;
  if (phase === PHASE.BETTING) {
    return (
      <div>
        <button
          onClick={deal}
          disabled={broke}
          className="w-full py-3 rounded-xl bg-yellow-300 text-emerald-950 font-bold text-lg hover:bg-yellow-200 disabled:opacity-40"
        >
          Deal
        </button>
        {broke && (
          <p className="text-center text-red-300 text-sm mt-2">Bankroll too low — reset to continue.</p>
        )}
      </div>
    );
  }

  if (phase === PHASE.SETTLE) {
    return (
      <button
        onClick={nextRound}
        className="w-full py-3 rounded-xl bg-yellow-300 text-emerald-950 font-bold text-lg hover:bg-yellow-200"
      >
        Next Hand
      </button>
    );
  }

  // Player turn.
  const Btn = ({ action, label, cls }) => (
    <button
      onClick={() => requestAction(action)}
      disabled={!legalActions[action]}
      className={`py-3 rounded-xl font-bold text-white disabled:opacity-30 transition ${cls}`}
    >
      {label}
    </button>
  );

  const hintIsMove = (a) => mode === 'learn' && liveHint && liveHint.move === a;

  return (
    <div>
      {mode === 'learn' && liveHint && (
        <div className="mb-3 bg-emerald-900/60 border border-emerald-400/40 rounded-xl p-3">
          <div className="text-[11px] uppercase tracking-wider text-emerald-200/80">Recommended</div>
          <div className="text-lg font-bold text-yellow-300">{moveLabel(liveHint.move)}</div>
          <p className="text-xs text-white/80 mt-1 leading-relaxed">{liveHint.explanation}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Btn action="hit" label="Hit" cls={`bg-sky-600 hover:bg-sky-500 ${hintIsMove('hit') ? 'ring-2 ring-yellow-300' : ''}`} />
        <Btn action="stand" label="Stand" cls={`bg-rose-600 hover:bg-rose-500 ${hintIsMove('stand') ? 'ring-2 ring-yellow-300' : ''}`} />
        <Btn action="double" label="Double" cls={`bg-violet-600 hover:bg-violet-500 ${hintIsMove('double') ? 'ring-2 ring-yellow-300' : ''}`} />
        <Btn action="split" label="Split" cls={`bg-amber-600 hover:bg-amber-500 ${hintIsMove('split') ? 'ring-2 ring-yellow-300' : ''}`} />
        <Btn action="surrender" label="Surrender" cls={`col-span-2 bg-gray-600 hover:bg-gray-500 ${hintIsMove('surrender') ? 'ring-2 ring-yellow-300' : ''}`} />
      </div>
    </div>
  );
}
