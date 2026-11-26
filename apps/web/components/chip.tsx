// Chip (design spec §3.2): a pill, 44 px high. Selected = gold fill. As a toggle button it uses
// aria-pressed; as a link (section nav, planet switcher) it uses aria-current.

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Chip({
  selected = false,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return <button type="button" aria-pressed={selected} className={`chip ${className}`.trim()} {...rest} />;
}

export function ChipLink({ href, current = false, children }: { href: string; current?: boolean; children: ReactNode }) {
  return (
    <Link href={href} aria-current={current ? "true" : undefined} className="chip">
      {children}
    </Link>
  );
}
