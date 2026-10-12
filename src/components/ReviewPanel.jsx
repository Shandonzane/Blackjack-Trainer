// Review of Quiz-mode mistakes, most-missed first. Each row explains the
// correct play and offers a one-click Practice drill that deals that exact
// scenario on repeat until you've got it down.
import { moveLabel } from '../engine/StrategyMatrix.js';

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default function ReviewPanel({ missList, onPractice, onClear }) {
  if (missList.length === 0) {
    return (
      <p className="text-sm text-white/70">
        No mistakes logged yet. Play some hands in <b className="text-yellow-300">Quiz</b> mode —
        every wrong move is recorded here so you can drill it.
      </p>
    );
  }

  const totalMisses = missList.reduce((s, m) => s + m.count, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-white/60">
          {totalMisses} mistake{totalMisses === 1 ? '' : 's'} across {missList.length} situation
          {missList.length === 1 ? '' : 's'}, worst first.
        </p>
        <button onClick={onClear} className="text-xs text-white/60 hover:text-white underline">
          Clear log
        </button>
      </div>

      <div className="space-y-2">
        {missList.map((m) => {
          const wrongMoves = Object.entries(m.chosen)
            .sort((a, b) => b[1] - a[1])
            .map(([mv]) => moveLabel(mv));
          return (
            <div key={m.key} className="bg-white/5 rounded-xl p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-sm">
                    {cap(m.playerLabel)} vs dealer {m.dealerLabel}
                    <span className="ml-2 text-xs text-rose-300">
                      ×{m.count} missed
                    </span>
                  </div>
                  <div className="text-xs text-white/70 mt-0.5">
                    Correct: <b className="text-emerald-300">{moveLabel(m.correctMove)}</b>
                    {wrongMoves.length > 0 && (
                      <span className="text-white/50"> · you played {wrongMoves.join(', ')}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onPractice(m)}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-yellow-300 text-emerald-950 text-xs font-bold hover:bg-yellow-200"
                >
                  Practice
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
