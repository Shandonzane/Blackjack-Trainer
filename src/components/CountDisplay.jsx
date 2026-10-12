// Real-time card-counting panel: Hi-Lo running count, true count, decks
// remaining, and a penetration bar showing progress toward the cut card.
export default function CountDisplay({ runningCount, trueCount, decksLeft, shoe }) {
  const pct = Math.min(100, Math.round((shoe.dealt / shoe.total) * 100));
  const cutPct = Math.round((shoe.cutCard / shoe.total) * 100);
  const sign = (n) => (n > 0 ? `+${n}` : `${n}`);

  return (
    <div className="bg-black/25 rounded-xl p-3 text-white">
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <Stat label="Running" value={sign(runningCount)} />
        <Stat label="True Count" value={sign(trueCount)} highlight />
        <Stat label="Decks Left" value={decksLeft.toFixed(1)} />
      </div>
      <div className="text-[10px] uppercase tracking-wider text-white/60 mb-1 flex justify-between">
        <span>Penetration</span>
        <span>{pct}% dealt</span>
      </div>
      <div className="relative h-2 rounded bg-white/10 overflow-hidden">
        <div className="h-full bg-emerald-400" style={{ width: `${pct}%` }} />
        {/* Cut card marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-red-400"
          style={{ left: `${cutPct}%` }}
          title="Cut card (reshuffle)"
        />
      </div>
    </div>
  );
}

function Stat({ label, value, highlight = false }) {
  return (
    <div>
      <div className={`text-xl font-bold ${highlight ? 'text-yellow-300' : 'text-white'}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/60">{label}</div>
    </div>
  );
}
