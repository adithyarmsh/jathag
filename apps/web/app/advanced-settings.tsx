// "Advanced settings" inside the birth form card (spec §5.2, D-134 items 3 and 8). The opener itself
// (a small text link above "See my chart") lives in birth-form.tsx; this is the panel, in this order:
//   1. Enter coordinates yourself (latitude, longitude, UTC offset dropdown; FR-IN-07)
//   2. Which clock was the time written on? (only when the birth is in a window; FR-IN-09)
//   3. How sure are you of the birth time? (two choices shown but switched off until 0.8.1, D-132)
//   4. Add seconds to the time
// All state lives in the form, so closing the panel keeps every choice. Presentational only.

import type { ClockId } from "@/lib/clock-rule";
import type { ClockChoiceView } from "@/lib/clock-choice";
import { UTC_OFFSETS, utcOffsetLabel } from "@/lib/utc-offsets";
import type { Messages } from "@/lib/i18n";
import { Tag } from "@/components/tag";

export interface AdvancedIds {
  panel: string;
  manual: string;
  lat: string;
  lng: string;
  offset: string;
  latError: string;
  lngError: string;
  clockLegend: string;
  /** Id of a clock option's radio: `${clockPrefix}-${clockId}` (focus target of the "i" note's link). */
  clockPrefix: string;
  seconds: string;
}

export function AdvancedSettings({
  t,
  comingSoon,
  ids,
  open,
  manualOn,
  onManual,
  lat,
  lng,
  offset,
  onLat,
  onLng,
  onOffset,
  latError,
  lngError,
  onCoordLeave,
  clock,
  clockChoice,
  onClock,
  secondsOn,
  onSeconds,
}: {
  t: Messages["form"]["advanced"];
  comingSoon: string;
  ids: AdvancedIds;
  open: boolean;
  manualOn: boolean;
  onManual: (on: boolean) => void;
  lat: string;
  lng: string;
  offset: number;
  onLat: (v: string) => void;
  onLng: (v: string) => void;
  onOffset: (v: number) => void;
  latError?: string;
  lngError?: string;
  onCoordLeave: (axis: "lat" | "lng") => void;
  /** The clock section, or null when it does not apply (also hidden while coordinates are typed). */
  clock: ClockChoiceView | null;
  clockChoice: ClockId | null;
  onClock: (id: ClockId) => void;
  secondsOn: boolean;
  onSeconds: (on: boolean) => void;
}) {
  const selectedClock = clock ? (clock.options.some((o) => o.id === clockChoice) ? clockChoice : clock.defaultClock) : null;
  const c = t.certainty;

  return (
    <div id={ids.panel} className="advanced-panel" data-open={open || undefined}>
      <div className="advanced-panel-inner">
        <div className="mt-2 space-y-6 rounded-md border border-line bg-raised p-4">
          {/* 1. Enter coordinates yourself */}
          <div>
            <label className="check-row form-label">
              <input id={ids.manual} type="checkbox" checked={manualOn} onChange={(e) => onManual(e.target.checked)} />
              <span>{t.manual.checkbox}</span>
            </label>
            {manualOn && (
              <div className="mt-2 space-y-4">
                <p className="field-hint">{t.manual.hint}</p>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ["lat", ids.lat, t.manual.latitude, t.manual.latitudeHint, lat, onLat, latError, ids.latError],
                      ["lng", ids.lng, t.manual.longitude, t.manual.longitudeHint, lng, onLng, lngError, ids.lngError],
                    ] as const
                  ).map(([axis, id, label, hint, value, set, error, errorId]) => (
                    <div key={axis} className="min-w-0">
                      <label htmlFor={id} className="field-label">
                        {label}
                      </label>
                      <input
                        id={id}
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        spellCheck={false}
                        value={value}
                        placeholder={hint.replace(/^e\.g\.\s*/, "")}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={[`${id}-hint`, error ? errorId : null].filter(Boolean).join(" ")}
                        onChange={(e) => set(e.target.value)}
                        onBlur={() => onCoordLeave(axis)}
                        className="form-input mt-1"
                      />
                      <p id={`${id}-hint`} className="field-hint mt-1">
                        {hint}
                      </p>
                      <div aria-live="polite">
                        {error && (
                          <p id={errorId} className="field-error mt-1">
                            {error}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <label htmlFor={ids.offset} className="field-label">
                    {t.manual.timeZone}
                  </label>
                  <span className="select-wrap mt-1">
                    <select
                      id={ids.offset}
                      value={String(offset)}
                      aria-describedby={`${ids.offset}-hint`}
                      onChange={(e) => onOffset(Number(e.target.value))}
                      className="form-input form-select"
                    >
                      {UTC_OFFSETS.map((o) => (
                        <option key={o} value={String(o)}>
                          {utcOffsetLabel(o)}
                        </option>
                      ))}
                    </select>
                  </span>
                  <p id={`${ids.offset}-hint`} className="field-hint mt-1">
                    {t.manual.timeZoneHint}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 2. Which clock? Only when the birth is in a window (and no coordinates are typed). */}
          {clock && !manualOn && (
            <fieldset aria-describedby={`${ids.clockLegend}-text`}>
              <legend id={ids.clockLegend} className="form-label">
                {t.clock.legend}
              </legend>
              <p id={`${ids.clockLegend}-text`} className="field-hint mt-1">
                {clock.sentence}
              </p>
              <div className="mt-3 space-y-2">
                {clock.options.map((o) => (
                  <label key={o.id} className="radio-card">
                    <input
                      id={`${ids.clockPrefix}-${o.id}`}
                      type="radio"
                      name={ids.clockPrefix}
                      value={o.id}
                      checked={selectedClock === o.id}
                      onChange={() => onClock(o.id)}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className={`text-[15px] leading-[22px] ${selectedClock === o.id ? "font-semibold" : "font-medium"}`}>{o.label}</span>
                      <span className="text-[13px] leading-5 text-muted">{o.detail}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {/* 3. How sure are you of the birth time? Only "exact" works until 0.8.1 (D-132). */}
          <fieldset>
            <legend className="form-label">{c.legend}</legend>
            <div className="mt-3 space-y-2">
              <label className="radio-card">
                <input type="radio" name={`${ids.panel}-certainty`} value="exact" defaultChecked />
                <span className="text-[15px] leading-[22px] font-semibold">{c.exact}</span>
              </label>
              <div className="radio-card radio-card-off flex-col gap-3">
                <label className="flex items-start gap-3">
                  <input type="radio" name={`${ids.panel}-certainty`} value="rough" disabled aria-disabled="true" />
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] leading-[22px]">
                    {c.rough} <Tag kind="soon">{comingSoon}</Tag>
                  </span>
                </label>
                <div className="w-full space-y-3 pl-[30px]">
                  <div className="grid grid-cols-2 gap-2">
                    {[c.from, c.to].map((label) => (
                      <label key={label} className="field-label min-w-0">
                        {label}
                        <input type="text" disabled aria-disabled="true" className="form-input mt-1" />
                      </label>
                    ))}
                  </div>
                  <div>
                    <p className="field-hint">{c.partOfDay}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {c.parts.map((p) => (
                        <button key={p} type="button" disabled aria-disabled="true" className="chip">
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="field-hint">{c.roughText}</p>
                </div>
              </div>
              <label className="radio-card radio-card-off">
                <input type="radio" name={`${ids.panel}-certainty`} value="unknown" disabled aria-disabled="true" />
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] leading-[22px]">
                  {c.unknown} <Tag kind="soon">{comingSoon}</Tag>
                </span>
              </label>
            </div>
          </fieldset>

          {/* 4. Add seconds to the time */}
          <label className="check-row form-label">
            <input id={ids.seconds} type="checkbox" checked={secondsOn} onChange={(e) => onSeconds(e.target.checked)} />
            <span>{t.seconds.checkbox}</span>
          </label>
        </div>
      </div>
    </div>
  );
}

