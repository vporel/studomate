import { FEEDBACK_COMMENT_MAX_LENGTH } from "./feedback-prompt";
import { parseFeedbackSubmission } from "./feedback-submission";

describe("parseFeedbackSubmission", () => {
	it("accepts a rating alone", () => {
		expect(parseFeedbackSubmission({ rating: 4 })).toEqual({
			rating: 4,
			comment: null,
			locale: null,
		});
	});

	it("trims the comment and keeps a known locale", () => {
		expect(
			parseFeedbackSubmission({ rating: 5, comment: "  top  ", locale: "en" }),
		).toEqual({ rating: 5, comment: "top", locale: "en" });
	});

	it("turns a blank comment into no comment and drops an unknown locale", () => {
		expect(
			parseFeedbackSubmission({ rating: 1, comment: "   ", locale: "de" }),
		).toEqual({ rating: 1, comment: null, locale: null });
	});

	it.each([undefined, null, "x", 0, 6, 2.5, "4", NaN])(
		"rejects the rating %p",
		(rating) => {
			expect(parseFeedbackSubmission({ rating })).toBeNull();
		},
	);

	it("rejects a payload that is not an object", () => {
		expect(parseFeedbackSubmission(null)).toBeNull();
		expect(parseFeedbackSubmission("rating")).toBeNull();
	});

	it("rejects a comment that is not a string", () => {
		expect(parseFeedbackSubmission({ rating: 3, comment: 12 })).toBeNull();
	});

	it("rejects a comment that is too long and accepts one at the limit", () => {
		const atLimit = "a".repeat(FEEDBACK_COMMENT_MAX_LENGTH);
		expect(
			parseFeedbackSubmission({ rating: 3, comment: atLimit })?.comment,
		).toBe(atLimit);
		expect(
			parseFeedbackSubmission({ rating: 3, comment: atLimit + "a" }),
		).toBeNull();
	});
});
