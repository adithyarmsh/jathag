// "Chart style" on the birth form (FR-IN-10, D-134 item 7, spec §5.2): two option cards, South Indian
// and North Indian, each with a small chart icon. A real radio group (arrow keys move between the two).
// Selected = 2 px accent edge on accent-soft. The choice is remembered by the form (lib/chart-style.ts).

import type { ChartStyle } from "@/lib/chart-style";
import type { Messages } from "@/lib/i18n";

/** South Indian: a 4 × 4 grid with the middle 2 × 2 empty. */
function SouthIcon() {
  return (
    <svg aria-hidden="true" focusable="false" width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="1" y="1" width="26" height="26" />
      <path d="M1 7.5h26M1 20.5h26M7.5 1v26M20.5 1v26M14 1v6.5M14 20.5v6.5M1 14h6.5M20.5 14h6.5" />
    </svg>
  );
}

/** North Indian: a square with both diagonals and the inner diamond. */
function NorthIcon() {
  return (
    <svg aria-hidden="true" focusable="false" width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="1" y="1" width="26" height="26" />
      <path d="M1 1l26 26M27 1L1 27M14 1L27 14L14 27L1 14Z" />
    </svg>
  );
}

export function ChartStyleChoice({
  t,
  name,
  value,
  onChange,
}: {
  t: Messages["form"]["chartStyle"];
  /** The radio group's name (unique on the page). */
  name: string;
  value: ChartStyle;
  onChange: (v: ChartStyle) => void;
}) {
  const options: { value: ChartStyle; label: string; icon: React.ReactNode }[] = [
    { value: "south", label: t.south, icon: <SouthIcon /> },
    { value: "north", label: t.north, icon: <NorthIcon /> },
  ];
  return (
    <fieldset>
      <legend className="form-label">{t.label}</legend>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {options.map((o) => (
          <label key={o.value} className="option-card">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.icon}
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
