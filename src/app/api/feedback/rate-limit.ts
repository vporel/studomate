const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;

const requestsByClient = new Map<string, number[]>();

/**
 * Counts a request from `client` and says whether it is allowed. Held in the memory of the
 * server process: it slows a flood down, it does not stop a determined one.
 */
export default function allowFeedbackRequest(
	client: string,
	now: number = Date.now(),
): boolean {
	const recent = (requestsByClient.get(client) ?? []).filter(
		(time) => now - time < WINDOW_MS,
	);
	if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
		requestsByClient.set(client, recent);
		return false;
	}
	recent.push(now);
	requestsByClient.set(client, recent);
	return true;
}

export function resetFeedbackRateLimit(): void {
	requestsByClient.clear();
}
