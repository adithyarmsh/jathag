"use client";

// Toggle (segmented, design spec §3.3): a pill with 1 px field-border and 3 px padding, options 38 px
// high; the selected option is filled gold and the fill slides (motion 3, 240 ms; instant with reduced
// motion). role="radiogroup" + role="radio" with arrow keys (one Tab stop, as a radio group).
// `value` may be null: nothing selected yet (AM / PM, D-094), then there is no fill.

import { useRef, type KeyboardEvent } from "react";

export interface ToggleOption<V extends string> {
  value: V;
  label: string;
}

export function Toggle<V extends string>({
  label,
  options,
  value,
  onChange,
  className = "",
}: {
  label: string;
  options: readonly ToggleOption<V>[];
  value: V | null;
  onChange: (v: V) => void;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = options.findIndex((o) => o.value === value);
  const n = options.length;

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + n) % n;
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={label} className={`toggle ${className}`.trim()}>
      {index >= 0 && (
        <span
          aria-hidden="true"
          className="toggle-fill"
          style={{
            width: `calc((100% - 6px - ${(n - 1) * 2}px) / ${n})`,
            transform: `translateX(calc(${index} * (100% + 2px)))`,
          }}
        />
      )}
      {options.map((o, i) => {
        const on = i === index;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on || (index < 0 && i === 0) ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className="toggle-option"
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
