/** Chat APIs must never use cached responses (CDN / SW / browser heuristics). */
export function chatFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return fetch(input, { ...init, cache: "no-store" });
}
