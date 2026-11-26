// Card (design spec §3.5). Outer: card fill, 1 px line, radius 16, the card shadow in light mode, and
// the accent border on hover / keyboard focus inside (D-066). Inner: plain 1 px line, radius 12, never
// reacts. Highlighted (current): accent-soft fill + accent border. Padding 16 phone / 24 desktop.

import type { ElementType, HTMLAttributes } from "react";

export type CardKind = "outer" | "inner" | "highlight";

const KIND: Record<CardKind, string> = {
  outer: "card-outer p-4 lg:p-6",
  inner: "card-inner bg-card p-4",
  highlight: "card-highlight p-4",
};

export function Card({
  as: Tag = "div",
  kind = "outer",
  className = "",
  ...rest
}: HTMLAttributes<HTMLElement> & { as?: ElementType; kind?: CardKind }) {
  return <Tag className={`${KIND[kind]} ${className}`.trim()} {...rest} />;
}
