// Field pieces (design spec §3.4): label above (13 px 500 muted), the control (.form-input: 44 px,
// 1 px field-border, radius 8, card fill), hint below (13 px muted), error (13 px 500 in the error
// colour, linked to the control with aria-describedby; the control gets aria-invalid and a 2 px edge).

import type { ReactNode } from "react";

export const FIELD_CONTROL = "form-input";

export function FieldLabel({ htmlFor, children, className = "" }: { htmlFor: string; children: ReactNode; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={`field-label ${className}`.trim()}>
      {children}
    </label>
  );
}

export function FieldHint({ id, children, className = "" }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <p id={id} className={`field-hint ${className}`.trim()}>
      {children}
    </p>
  );
}

export function FieldError({ id, text, className = "" }: { id: string; text?: string | null; className?: string }) {
  if (!text) return null;
  return (
    <p id={id} className={`field-error mt-2 ${className}`.trim()}>
      {text}
    </p>
  );
}
