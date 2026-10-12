// A single 2D playing card. `faceDown` renders the dealer's hole card back.
export default function Card({ card, faceDown = false }) {
  if (faceDown || !card) {
    return (
      <div className="w-14 h-20 sm:w-16 sm:h-24 rounded-lg border border-blue-900 bg-gradient-to-br from-blue-700 to-blue-900 shadow-md flex items-center justify-center animate-deal">
        <div className="w-8 h-14 rounded border-2 border-blue-300/40" />
      </div>
    );
  }
  const color = card.red ? 'text-red-600' : 'text-gray-900';
  return (
    <div className="w-14 h-20 sm:w-16 sm:h-24 rounded-lg border border-gray-300 bg-white shadow-md relative animate-deal select-none">
      <div className={`absolute top-1 left-1.5 leading-none font-bold ${color}`}>
        <div className="text-sm sm:text-base">{card.rank}</div>
        <div className="text-xs sm:text-sm">{card.suit}</div>
      </div>
      <div className={`absolute inset-0 flex items-center justify-center text-2xl sm:text-3xl ${color}`}>
        {card.suit}
      </div>
      <div className={`absolute bottom-1 right-1.5 leading-none font-bold rotate-180 ${color}`}>
        <div className="text-sm sm:text-base">{card.rank}</div>
        <div className="text-xs sm:text-sm">{card.suit}</div>
      </div>
    </div>
  );
}
