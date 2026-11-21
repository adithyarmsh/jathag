// Error codes from the chart and place-search API (packages/api/src/errors.ts) → which form field
// the friendly message is shown next to (FR-IN-08). The words themselves are in
// messages/en.json under "errors" (D-063); raw codes are never shown.

import type { ApiErrorCode } from "@jathag/api";
import type { Messages } from "./i18n";

export type FormField = "date" | "time" | "place" | "form";

/** Every API error code and the field it belongs to. A new code fails the type check until added. */
export const ERROR_FIELD: Record<ApiErrorCode, FormField> = {
  INVALID_REQUEST: "form",
  REQUEST_TOO_LARGE: "form",
  INVALID_DATE: "date",
  DATE_OUT_OF_RANGE: "date",
  INVALID_TIME: "time",
  NONEXISTENT_LOCAL_TIME: "time",
  AMBIGUOUS_LOCAL_TIME: "time",
  INVALID_REPEATED_TIME: "time",
  MISSING_PLACE: "place",
  INVALID_PLACE: "place",
  INVALID_LOCATION: "place",
  INVALID_TIME_ZONE: "place",
  INVALID_UTC_OFFSET: "place",
  INVALID_CLOCK_CHOICE: "form",
  UNKNOWN_SETTING: "form",
  SETTING_NOT_SUPPORTED: "form",
  INTERNAL_ERROR: "form",
};

export interface FieldError {
  field: FormField;
  code: ApiErrorCode | "network" | "unknown";
  message: string;
}

/** An error code from the API (or none, e.g. a non-JSON reply) → field + friendly message. */
export function errorFor(code: string | undefined, t: Messages["errors"]): FieldError {
  if (code && code in ERROR_FIELD) {
    const c = code as ApiErrorCode;
    return { field: ERROR_FIELD[c], code: c, message: t[c] };
  }
  return { field: "form", code: "unknown", message: t.unknown };
}

export const networkError = (t: Messages["errors"]): FieldError => ({ field: "form", code: "network", message: t.network });
