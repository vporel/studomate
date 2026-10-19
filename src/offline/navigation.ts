/** `/app` and `/app/…` only: a bare `/app` prefix would also match `/apple-touch-icon.png`. */
function isAppPath(pathname: string): boolean {
	return pathname === "/app" || pathname.startsWith("/app/");
}

/**
 * Whether the service worker answers a navigation to `pathname`. Any other page goes straight
 * to the network, as without a service worker.
 */
export function isOfflineNavigation(
	pathname: string,
	precachedPaths: ReadonlySet<string>,
): boolean {
	return isAppPath(pathname) || precachedPaths.has(pathname);
}

/**
 * Whether a network answer is the expected Next.js page and not, for instance, a captive portal
 * replying 200 with its own HTML.
 */
export function isExpectedPage(
	response: Pick<Response, "ok" | "redirected" | "url" | "headers">,
	html: string,
	origin: string,
): boolean {
	if (!response.ok || response.redirected) return false;
	if (new URL(response.url, origin).origin !== origin) return false;
	if (!response.headers.get("content-type")?.includes("text/html")) return false;
	return html.includes("/_next/static/");
}
