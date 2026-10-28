import allowFeedbackRequest, { resetFeedbackRateLimit } from "./rate-limit";

describe("allowFeedbackRequest", () => {
	beforeEach(resetFeedbackRateLimit);

	it("allows five requests in a window and refuses the next", () => {
		for (let i = 0; i < 5; i++) {
			expect(allowFeedbackRequest("a", 1000 + i)).toBe(true);
		}
		expect(allowFeedbackRequest("a", 1010)).toBe(false);
	});

	it("counts each client separately", () => {
		for (let i = 0; i < 5; i++) allowFeedbackRequest("a", 1000);
		expect(allowFeedbackRequest("b", 1000)).toBe(true);
	});

	it("forgets requests older than the window", () => {
		for (let i = 0; i < 5; i++) allowFeedbackRequest("a", 0);
		expect(allowFeedbackRequest("a", 10 * 60 * 1000)).toBe(true);
	});
});
