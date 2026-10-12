import Card from './Card.jsx';
import { handValue } from '../engine/DeckEngine.js';

// Renders a row of cards plus the computed total. Used for both the dealer
// and each player hand. `hideHole` keeps the dealer's second card face down
// and the total hidden until the reveal.
export default function Hand({ label, cards, hideHole = false, active = false, result = null, bet = null, doubled = false }) {
  const visible = hideHole ? cards.slice(0, 1) : cards;
  const hv = hideHole ? null : handValue(cards);

  const resultColor =
    result === 'win' || result === 'blackjack'
      ? 'text-green-300'
      : result === 'lose' || result === 'bust'
      ? 'text-red-300'
      : result === 'push'
      ? 'text-yellow-200'
      : 'text-white';

  return (
    <div
      className={`rounded-xl p-3 transition ${
        active ? 'ring-2 ring-yellow-300 bg-black/20' : 'bg-black/10'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-white/70">{label}</span>
        <div className="flex items-center gap-2">
          {bet != null && (
            <span className="text-xs text-amber-200">
              ${bet}{doubled ? ' (2x)' : ''}
            </span>
          )}
          {hv && (
            <span className={`text-sm font-bold ${resultColor}`}>
              {hv.isBust ? `${hv.total} BUST` : hv.soft ? `${hv.total} soft` : hv.total}
              {hv.isBlackjack ? ' BJ' : ''}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {cards.map((c, i) => (
          <Card key={c.id} card={c} faceDown={hideHole && i === 1} />
        ))}
        {visible.length === 0 && <div className="h-20 sm:h-24" />}
      </div>
      {result && (
        <div className={`mt-2 text-xs font-semibold uppercase tracking-wide ${resultColor}`}>
          {result}
        </div>
      )}
    </div>
  );
}
