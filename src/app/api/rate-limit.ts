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
	let lastSweep = 0;

	/** Forgets the clients whose requests all left the window, at most once per window. */
	const sweep = (now: number) => {
		if (now - lastSweep < windowMs) return;
		lastSweep = now;
		for (const [client, times] of requestsByClient) {
			if (times.every((time) => now - time >= windowMs))
				requestsByClient.delete(client);
		}
	};

	return {
		allow(client, now = Date.now()) {
			sweep(now);
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
			lastSweep = 0;
		},
	};
}

/**
 * Address of the visitor. The proxy in front of the application appends the visitor's address to
 * `X-Forwarded-For`, so the last entry is the one to trust: the entries before it are whatever
 * the visitor sent. Assumes a single trusted proxy.
 */
export function clientAddress(request: Request): string {
	const forwarded = request.headers
		.get("x-forwarded-for")
		?.split(",")
		.map((entry) => entry.trim())
		.filter((entry) => entry !== "");
	return forwarded?.at(-1) || request.headers.get("x-real-ip") || "unknown";
}
