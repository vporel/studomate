"use client";

import { getFeedbackPromptState } from "@/persistence/feedback-prompt.storage";
import {
	markFeedbackAlreadyGiven,
	recordFeedbackVisit,
} from "@/ui/services/feedback-prompt";
import hasGivenFeedback from "@/ui/services/has-given-feedback";
import { useAuthStore } from "@/ui/stores/auth/auth.store";
import { getShareTokenFromUrl } from "@/ui/stores/project/url/project-url";
import { useEffect } from "react";
import FeedbackBox from "./FeedbackBox";

/**
 * Counts the visit, stops asking a signed-in user who already answered (on any browser), and
 * hosts the feedback box. Someone opening a shared link is not a user yet.
 */
export default function FeedbackPrompt() {
	const userId = useAuthStore((state) => state.user?.id ?? null);

	useEffect(() => {
		if (getShareTokenFromUrl() === null) recordFeedbackVisit();
	}, []);

	useEffect(() => {
		if (!userId || getFeedbackPromptState().answered) return;
		let cancelled = false;
		void hasGivenFeedback(userId).then((given) => {
			if (given && !cancelled) markFeedbackAlreadyGiven();
		});
		return () => {
			cancelled = true;
		};
	}, [userId]);

	return <FeedbackBox />;
}
