// The "Which clock?" rule (FR-IN-09; D-082, D-086, D-090), used in the BROWSER so the "i" note can
// appear as soon as a date and a place are chosen, before "See my chart".
//
// It is the very same code the chart API uses (packages/api/src/clock.ts), imported by file path on
// purpose: '@jathag/api' itself would pull the engine and Swiss Ephemeris into the page. clock.ts
// only imports '@jathag/places', whose main file is plain TypeScript (no file access, no index);
// apps/web/lib/clock-rule.test.ts checks both, so a change that would drag the engine or the place
// index into the browser fails the tests.
//
// The page never sends a clock choice: the chart always uses the default clock (D-092).
export { clockQuestion, BOMBAY_TIME_SECONDS, CALCUTTA_TIME_SECONDS, IST_SECONDS, WAR_TIME_SECONDS } from "../../../packages/api/src/clock.ts";
export type { ClockQuestion, ClockPlace, ClockWindowId, ClockId } from "../../../packages/api/src/clock.ts";
