/** Cloudflare Workers の中で動いているか。Workers のランタイムでは navigator.userAgent が "Cloudflare-Workers" になる */
export function isWorkers() {
  return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
}
