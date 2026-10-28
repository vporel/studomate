import { isLocale, type Locale } from "@/i18n/config";
import {
	FEEDBACK_COMMENT_MAX_LENGTH,
	FEEDBACK_RATING_MAX,
} from "./feedback-prompt";

/** An opinion as it travels from the app to the `/api/feedback` route. */
export type FeedbackSubmission = {
	rating: number;
	comment: string | null;
	locale: Locale | null;
};

/** `null` when the payload is not a valid opinion. A blank comment is no comment. */
export function parseFeedbackSubmission(
	raw: unknown,
): FeedbackSubmission | null {
	if (typeof raw !== "object" || raw === null) return null;
	const { rating, comment, locale } = raw as Record<string, unknown>;

	if (
		typeof rating !== "number" ||
		!Number.isInteger(rating) ||
		rating < 1 ||
		rating > FEEDBACK_RATING_MAX
	)
		return null;

	if (comment !== undefined && comment !== null && typeof comment !== "string")
		return null;
	const trimmed = typeof comment === "string" ? comment.trim() : "";
	if (trimmed.length > FEEDBACK_COMMENT_MAX_LENGTH) return null;

	return {
		rating,
		comment: trimmed === "" ? null : trimmed,
		locale: isLocale(locale) ? locale : null,
	};
}
