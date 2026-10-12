// "By the book" basic-strategy chart. Renders hard totals, soft totals, and
// pairs as colour-coded grids built from the live resolved strategy object, so
// the chart always reflects the active casino-rule toggles.
import {
  DEALER_COLS,
  CHART_ROWS,
  chartRowLabel,
  chartColLabel,
  resolveChartCell,
} from '../engine/StrategyMatrix.js';

const KIND_STYLES = {
  hit: 'bg-rose-500/90',
  stand: 'bg-emerald-500/90',
  double: 'bg-sky-500/90',
  split: 'bg-amber-400/90 text-emerald-950',
  surrender: 'bg-gray-400/90 text-emerald-950',
};

function Grid({ title, section, table, rules }) {
  const rows = CHART_ROWS[section];
  return (
    <div className="mb-5">
      <h3 className="text-sm font-bold text-yellow-300 mb-1.5">{title}</h3>
      <div className="overflow-x-auto">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 bg-emerald-950 px-1.5 py-1 text-white/60 font-semibold text-left">
                {section === 'pairs' ? 'Pair' : section === 'soft' ? 'Soft' : 'Hard'}
              </th>
              {DEALER_COLS.map((col) => (
                <th key={col} className="px-1.5 py-1 text-white/60 font-semibold w-8">
                  {chartColLabel(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((rk) => (
              <tr key={rk}>
                <td className="sticky left-0 bg-emerald-950 px-1.5 py-0.5 text-white/80 font-semibold whitespace-nowrap">
                  {chartRowLabel(section, rk)}
                </td>
                {DEALER_COLS.map((col) => {
                  const cell = resolveChartCell(table[rk][col], rules);
                  return (
                    <td key={col} className="p-0.5">
                      <div
                        className={`w-7 h-6 sm:w-8 sm:h-7 rounded flex items-center justify-center font-bold text-[10px] sm:text-[11px] ${KIND_STYLES[cell.kind]}`}
                      >
                        {cell.label}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LegendChip({ kind, text }) {
  return (
    <span className="inline-flex items-center gap-1.5 mr-3 mb-1">
      <span className={`w-4 h-4 rounded ${KIND_STYLES[kind]}`} />
      <span className="text-xs text-white/80">{text}</span>
    </span>
  );
}

export default function StrategyChart({ strategy, rules }) {
  return (
    <div>
      <p className="text-xs text-white/60 mb-3">
        Columns are the dealer's upcard. Reflects current rules:{' '}
        <b className="text-white/80">
          {rules.decks}D · {rules.h17 ? 'H17' : 'S17'} · {rules.das ? 'DAS' : 'no DAS'} ·{' '}
          {rules.surrender ? 'surrender' : 'no surrender'}
          {rules.noBust ? ' · no-bust' : ''}
        </b>
      </p>
      <div className="mb-3">
        <LegendChip kind="hit" text="Hit" />
        <LegendChip kind="stand" text="Stand" />
        <LegendChip kind="double" text="Double (else hit/stand)" />
        <LegendChip kind="split" text="Split" />
        <LegendChip kind="surrender" text="Surrender" />
      </div>
      <Grid title="Hard totals" section="hard" table={strategy.hard} rules={rules} />
      <Grid title="Soft totals (Ace + card)" section="soft" table={strategy.soft} rules={rules} />
      <Grid title="Pairs" section="pairs" table={strategy.pairs} rules={rules} />
      <p className="text-[11px] text-white/40">
        Totals 5–7 always hit; 18+ hard always stands; 10,10 always stands — omitted for space.
      </p>
    </div>
  );
}
