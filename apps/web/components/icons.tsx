// Small line icons for the app shell (decoration only: always aria-hidden; the button carries the name).

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

export function MoonIcon({ className }: { className?: string }) {
  return (
    <svg {...base} width={18} height={18} className={className}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </svg>
  );
}

export function SunIcon({ className }: { className?: string }) {
  return (
    <svg {...base} width={18} height={18} className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

/** A cog (the mockup's rayed circle read as a sun next to the theme button, so the teeth are thick). */
export function SettingsIcon() {
  return (
    <svg {...base} width={18} height={18}>
      <circle cx="12" cy="12" r="6.6" />
      <circle cx="12" cy="12" r="2.4" />
      <path strokeWidth={3} strokeLinecap="butt" d="M19.20 12.00L21.60 12.00 M17.09 17.09L18.79 18.79 M12.00 19.20L12.00 21.60 M6.91 17.09L5.21 18.79 M4.80 12.00L2.40 12.00 M6.91 6.91L5.21 5.21 M12.00 4.80L12.00 2.40 M17.09 6.91L18.79 5.21" />
    </svg>
  );
}

export function MenuIcon() {
  return (
    <svg {...base} width={20} height={20}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg {...base} width={20} height={20} strokeWidth={1.8}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** The gold four-point star (spec §3.6). */
export const STAR_D = "M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z";
