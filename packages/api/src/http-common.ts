// Web-standard Request → Response handlers for the two endpoints. The Next.js route files in
// apps/web only call these, so the whole endpoint can be tested without a server.
//
// Privacy (FR-API-02, D-014): the body is read here and never logged, stored or put in an error;
// every response has Cache-Control: no-store. For an unexpected failure only the error's class name
// and code are logged (never its message, which could contain input).

// Shared by both endpoints. Must NOT import the engine: the search function on Vercel has no
// Swiss Ephemeris binary (a test checks this).
import { ApiError, errorBody } from './errors.ts';


const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex',
};

export type Timing = Record<string, number>;

export function respond(status: number, body: unknown, timing: Timing): Response {
  const serverTiming = Object.entries(timing).map(([k, v]) => `${k};dur=${v.toFixed(1)}`).join(', ');
  return new Response(JSON.stringify(body), { status, headers: { ...HEADERS, 'Server-Timing': serverTiming } });
}

export async function readJson(request: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > maxBytes) throw new ApiError('REQUEST_TOO_LARGE', 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) throw new ApiError('REQUEST_TOO_LARGE', 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError('INVALID_REQUEST');
  }
}

/** Runs fn, turning any error into a coded response; adds Server-Timing (wall and CPU time). */
export async function handle(name: string, fn: (timing: Timing) => Promise<unknown>): Promise<Response> {
  const t0 = performance.now();
  const c0 = process.cpuUsage();
  const timing: Timing = {};
  const finish = () => {
    const c = process.cpuUsage(c0);
    timing.cpu = (c.user + c.system) / 1000;
    timing.total = performance.now() - t0;
    return timing;
  };
  try {
    const body = await fn(timing);
    return respond(200, body, finish());
  } catch (e) {
    if (e instanceof ApiError) return respond(e.status, errorBody(e), finish());
    const err = e as { name?: unknown; code?: unknown };
    // Class name and code only: an error message could contain part of the request.
    console.error(`[${name}] internal error: ${String(err?.name ?? 'unknown')}${err?.code ? ` ${String(err.code)}` : ''}`);
    return respond(500, errorBody(new ApiError('INTERNAL_ERROR', 500)), finish());
  }
}

