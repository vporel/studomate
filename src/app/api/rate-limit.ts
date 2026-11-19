const DEFAULT_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_MAX_REQUESTS = 5;

export type RateLimiter = {
	/** Counts a request from `client` and says whether it is allowed. */
	allow(client: string, now?: number): boolean;
	reset(): void;
};

/**
 * `maxRequests` per client every `windowMs` (five every ten minutes by default). Held in the
 * memory of the server process: it slows a flood down, it does not stop a determined one.
 */
export default function createRateLimiter({
	maxRequests = DEFAULT_MAX_REQUESTS,
	windowMs = DEFAULT_WINDOW_MS,
}: { maxRequests?: number; windowMs?: number } = {}): RateLimiter {
	const requestsByClient = new Map<string, number[]>();
	return {
		allow(client, now = Date.now()) {
			const recent = (requestsByClient.get(client) ?? []).filter(
				(time) => now - time < windowMs,
			);
			if (recent.length >= maxRequests) {
				requestsByClient.set(client, recent);
				return false;
			}
			recent.push(now);
			requestsByClient.set(client, recent);
			return true;
		},
		reset() {
			requestsByClient.clear();
		},
	};
}

export function clientAddress(request: Request): string {
	return (
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		request.headers.get("x-real-ip") ||
		"unknown"
	);
}
