// Notice (design spec §3.11): a quiet accent-soft panel, radius 12, 14/22 text. `strong` adds the 1 px
// accent border (the wellness disclaimer).

import type { ReactNode } from "react";

export function Notice({ children, strong = false, className = "" }: { children: ReactNode; strong?: boolean; className?: string }) {
  return <div className={`notice ${strong ? "notice-strong" : ""} ${className}`.trim()}>{children}</div>;
}
