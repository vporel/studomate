import trackEvent from "@/ui/services/analytics";
import notifyFeedbackMilestone from "@/ui/services/feedback-prompt";

/** Records a finished PDF export for the audience measure and for the feedback request. */
export default function trackPdfExported(summary: {
	programs: number;
	withVariablesTable: boolean;
}): void {
	trackEvent("pdf-exported", summary);
	notifyFeedbackMilestone("pdf-exported");
}
