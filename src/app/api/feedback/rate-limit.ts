import createRateLimiter from "../rate-limit";

const limiter = createRateLimiter();

export default function allowFeedbackRequest(
	client: string,
	now: number = Date.now(),
): boolean {
	return limiter.allow(client, now);
}

export function resetFeedbackRateLimit(): void {
	limiter.reset();
}
