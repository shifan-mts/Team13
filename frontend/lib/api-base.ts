/**
 * Where the UI sends API calls.
 *
 * Unset (the default) → same-origin, i.e. the built-in Next.js route handlers.
 * Set to e.g. http://localhost:8000 → the standalone backend/ service.
 *
 * Both serve identical endpoints, so this is a deployment choice, not a
 * behavioural one. Keeping same-origin as the default means the app runs as a
 * single process unless you deliberately opt out.
 */
export function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  return `${base}${path}`;
}
