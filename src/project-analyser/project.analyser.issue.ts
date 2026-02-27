export type ProjectAnalyserIssueSeverity = "error" | "warning";

export type ProjectAnalyserIssueSource = {
	sourceType:
		| "grafcet"
		| "grafcet-step"
		| "grafcet-transition"
		| "grafcet-action"
		| "grafcet-step-referral-source"
		| "grafcet-step-referral-target";
	sourceId: string;
	parentId?: string; // For issues on steps, transitions or actions, the ID of the parent grafcet
};

export default class ProjectAnalyserIssue {
	readonly severity: ProjectAnalyserIssueSeverity;
	readonly source: ProjectAnalyserIssueSource;
	readonly message: string;

	constructor(severity: ProjectAnalyserIssueSeverity, source: ProjectAnalyserIssueSource, message: string) {
		this.severity = severity;
		this.source = source;
		this.message = message;
	}
}
