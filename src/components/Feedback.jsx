import { moveLabel } from '../engine/StrategyMatrix.js';

// Quiz-mode feedback. On a wrong move the game is frozen behind this overlay
// until the player acknowledges, with the specific correct play explained.
export default function Feedback({ feedback, onAck }) {
  if (!feedback) return null;

  // Correct answers flash a small non-blocking banner.
  if (feedback.correct) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-semibold animate-deal">
        ✓ {feedback.text}
      </div>
    );
  }

  // Wrong answers: modal that freezes play.
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl animate-deal">
        <div className="text-red-600 font-bold text-lg mb-1">Not the book play</div>
        <div className="text-sm text-gray-700 mb-3">
          You chose <b>{moveLabel(feedback.chose)}</b>. The correct play was{' '}
          <b className="text-emerald-700">{moveLabel(feedback.optimal)}</b>.
        </div>
        <p className="text-sm text-gray-800 leading-relaxed bg-gray-100 rounded-lg p-3 mb-4">
          {feedback.text}
        </p>
        <button
          onClick={onAck}
          className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500"
        >
          Got it — continue
        </button>
      </div>
    </div>
  );
}
