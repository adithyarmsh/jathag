// Tag (design spec §3.11): "Coming soon" (soon colours), "Active now" (accent-soft) and the "BETA"
// outline pill in the header. Words, never colour alone.

import type { ReactNode } from "react";

export type TagKind = "soon" | "active" | "beta";

export function Tag({ kind, children, className = "" }: { kind: TagKind; children: ReactNode; className?: string }) {
  return <span className={`tag tag-${kind} ${className}`.trim()}>{children}</span>;
}
