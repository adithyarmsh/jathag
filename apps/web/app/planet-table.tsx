// The planet table (FR-PL-01, D-092), last on the chart page (step 0.5.1, design spec §6.9, D-129): Lagna +
// the 9 grahas with sign, degree in sign to the second, nakshatra and pada, house and dignity; Retrograde
// and Combust as columns on desktop, as "(R)" / "combust" after the name on phones (the table scrolls
// sideways inside a `relative` box, D-119). Under it the settings, place and clock used (FR-SET-03,
// FR-IN-06). Every value comes from the chart API. Planet names are not links yet (0.5.3).

import type { ChartResponse } from "@jathag/api";
import { clockUsed, fill, formatCoordinate, settingsLine, tableRows } from "@/lib/chart-format";
import type { Messages } from "@/lib/i18n";

/** One cell: "—" gets a screen-reader label, "R" an abbreviation. */
export function Cell({ value, t }: { value: string; t: Messages["chart"] }) {
  if (value === t.notApplicable) {
    return (
      <>
        <span aria-hidden="true">{value}</span>
        <span className="sr-only">{t.notApplicableLabel}</span>
      </>
    );
  }
  if (value === t.retrograde) return <abbr title={t.retrogradeLabel} className="no-underline">{value}</abbr>;
  return <>{value}</>;
}

export function PlanetTable({ result, t, labelledBy }: { result: ChartResponse; t: Messages; labelledBy: string }) {
  const c = t.chart;
  const rows = tableRows(result.chart, c);
  const col = c.columns;
  return (
    <div className="card-outer p-4 lg:p-6">
      <p className="mb-3 text-[13px] leading-5 text-muted lg:hidden">{c.scrollHint}</p>
      <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-labelledby={labelledBy}>
        <table className="data-table w-full min-w-[520px] border-collapse text-left lg:min-w-0">
          <caption className="sr-only">{c.title}</caption>
          <thead>
            <tr>
              <th scope="col">{col.body}</th>
              <th scope="col">{col.sign}</th>
              <th scope="col">{col.degree}</th>
              <th scope="col">{t.chartPage.planets.nakshatraPada}</th>
              <th scope="col">{col.house}</th>
              <th scope="col">{col.dignity}</th>
              <th scope="col" className="hidden lg:table-cell">
                {col.retrograde}
              </th>
              <th scope="col" className="hidden lg:table-cell">
                {col.combust}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code}>
                <th scope="row">
                  {r.name}
                  {r.retrograde === c.retrograde && (
                    <span className="lg:hidden">
                      {" "}
                      <abbr title={c.retrogradeLabel} className="no-underline">
                        {c.southChart.retrogradeMark}
                      </abbr>
                    </span>
                  )}
                  {r.combust === c.combust && <span className="planet-combust lg:hidden">{t.chartPage.planets.combustMark}</span>}
                </th>
                <td>{r.sign}</td>
                <td className="tabular-nums whitespace-nowrap">{r.degree}</td>
                <td className="whitespace-nowrap">
                  {r.nakshatra} <span className="tabular-nums">{r.pada}</span>
                </td>
                <td className="tabular-nums">{r.house}</td>
                <td>
                  <Cell value={r.dignity} t={c} />
                </td>
                <td className="hidden lg:table-cell">
                  <Cell value={r.retrograde} t={c} />
                </td>
                <td className="hidden lg:table-cell">
                  <Cell value={r.combust} t={c} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 space-y-1 border-t border-line pt-4 text-xs leading-relaxed text-muted">
        <p>{c.methodLine}</p>
        <p>{settingsLine(result.settings, c)}</p>
        <p>
          {fill(c.placeLine, {
            lat: formatCoordinate(result.place.lat, "lat"),
            lng: formatCoordinate(result.place.lng, "lng"),
            offset: clockUsed(result.clock, c),
          })}
        </p>
        <p>{fill(c.engineLine, { version: result.engineVersion })}</p>
      </div>
    </div>
  );
}
