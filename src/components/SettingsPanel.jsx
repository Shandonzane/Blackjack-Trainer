// Casino-rules controls (rendered inside the Settings modal). Every toggle here
// feeds back into the StrategyMatrix via updateRule(), so the recommended plays
// and the strategy chart update live. Game Mode (Learn/Quiz) lives on the main
// page, not here.
export default function SettingsPanel({ rules, updateRule }) {
  return (
    <div className="text-white space-y-4">
      <div>
        <Label>Dealer · Soft 17</Label>
        <div className="grid grid-cols-2 gap-2">
          <Segment active={rules.h17} onClick={() => updateRule('h17', true)}>H17 (hits)</Segment>
          <Segment active={!rules.h17} onClick={() => updateRule('h17', false)}>S17 (stands)</Segment>
        </div>
      </div>

      <div>
        <Label>Shoe Size</Label>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 6, 8].map((d) => (
            <Segment key={d} active={rules.decks === d} onClick={() => updateRule('decks', d)}>{d}</Segment>
          ))}
        </div>
        <p className="text-[11px] text-white/50 mt-1">Changing shoe size shuffles a fresh shoe and resets the count.</p>
      </div>

      <div>
        <Label>Player Options</Label>
        <div className="space-y-2">
          <Toggle checked={rules.das} onChange={(v) => updateRule('das', v)} label="Double After Split (DAS)" />
          <Toggle checked={rules.surrender} onChange={(v) => updateRule('surrender', v)} label="Late Surrender" />
          <Toggle checked={rules.noBust} onChange={(v) => updateRule('noBust', v)} label='"No-bust" strategy variation' />
        </div>
      </div>

      <div>
        <Label>Display</Label>
        <Toggle
          checked={rules.showBankroll}
          onChange={(v) => updateRule('showBankroll', v)}
          label="Show betting & bankroll"
        />
        <p className="text-[11px] text-white/50 mt-1">
          Turn off to hide the bankroll/bet panel and just drill strategy.
        </p>
      </div>

      <p className="text-[11px] text-amber-200/80">
        Defaults match common large-Oklahoma-casino main tables (8 decks, H17, DAS, no surrender, 3:2).
      </p>
    </div>
  );
}

function Label({ children }) {
  return <div className="text-[11px] uppercase tracking-wider text-white/60 mb-1.5">{children}</div>;
}
function Segment({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`py-1.5 rounded-lg text-sm font-semibold transition ${
        active ? 'bg-yellow-300 text-emerald-950' : 'bg-white/10 text-white/80 hover:bg-white/20'
      }`}
    >
      {children}
    </button>
  );
}
function Toggle({ checked, onChange, label }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-lg px-3 py-1.5 transition"
    >
      <span className="text-sm text-white/85 text-left">{label}</span>
      <span className={`w-9 h-5 rounded-full p-0.5 transition ${checked ? 'bg-yellow-300' : 'bg-white/20'}`}>
        <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </span>
    </button>
  );
}
