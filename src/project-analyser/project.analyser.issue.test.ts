import ProjectAnalyserIssue from "./project.analyser.issue";

describe("ProjectAnalyserIssue", () => {
	describe("constructor", () => {
		it("creates an error issue", () => {
			const issue = new ProjectAnalyserIssue(
				"error",
				"GRAFCET_NO_INITIAL_STEP",
				{ sourceType: "grafcet", sourceId: "grafcet-1" },
			);

			expect(issue.severity).toBe("error");
			expect(issue.code).toBe("GRAFCET_NO_INITIAL_STEP");
			expect(issue.source.sourceType).toBe("grafcet");
			expect(issue.source.sourceId).toBe("grafcet-1");
			expect(issue.params).toEqual({});
		});

		it("creates a warning issue", () => {
			const issue = new ProjectAnalyserIssue(
				"warning",
				"ACTION_EMPTY_EXPRESSION",
				{ sourceType: "grafcet-step", sourceId: "step-1" },
			);

			expect(issue.severity).toBe("warning");
			expect(issue.code).toBe("ACTION_EMPTY_EXPRESSION");
			expect(issue.source.sourceType).toBe("grafcet-step");
			expect(issue.source.sourceId).toBe("step-1");
		});

		it("creates issue with parent ID", () => {
			const issue = new ProjectAnalyserIssue(
				"error",
				"TRANSITION_EMPTY_EXPRESSION",
				{
					sourceType: "grafcet-transition",
					sourceId: "transition-1",
					parentId: "grafcet-1",
				},
			);

			expect(issue.source.parentId).toBe("grafcet-1");
		});
	});

	describe("source types", () => {
		it("supports all grafcet element types", () => {
			const sourceTypes = [
				"grafcet",
				"grafcet-step",
				"grafcet-transition",
				"grafcet-action",
				"grafcet-step-referral-source",
				"grafcet-step-referral-target",
				"grafcet-junction-and-start",
				"grafcet-junction-and-end",
				"grafcet-junction-or-start",
				"grafcet-junction-or-end",
			] as const;

			sourceTypes.forEach((sourceType) => {
				const issue = new ProjectAnalyserIssue(
					"error",
					"GRAFCET_NO_INITIAL_STEP",
					{ sourceType, sourceId: "test-id" },
				);
				expect(issue.source.sourceType).toBe(sourceType);
			});
		});
	});

	describe("severity types", () => {
		it("supports error severity", () => {
			const issue = new ProjectAnalyserIssue(
				"error",
				"GRAFCET_NO_INITIAL_STEP",
				{ sourceType: "grafcet", sourceId: "test" },
			);
			expect(issue.severity).toBe("error");
		});

		it("supports warning severity", () => {
			const issue = new ProjectAnalyserIssue(
				"warning",
				"ACTION_EMPTY_EXPRESSION",
				{ sourceType: "grafcet", sourceId: "test" },
			);
			expect(issue.severity).toBe("warning");
		});
	});

	describe("params and cause", () => {
		it("stores interpolation params by code", () => {
			const issue = new ProjectAnalyserIssue(
				"error",
				"STEP_NUMBER_DUPLICATE",
				{ sourceType: "grafcet-step", sourceId: "test" },
				{ stepNumber: 3 },
			);
			expect(issue.params).toEqual({ stepNumber: 3 });
		});

		it("keeps the wrapped exception for *_INVALID_EXPRESSION codes", () => {
			const cause = new Error("boom");
			const issue = new ProjectAnalyserIssue(
				"error",
				"TRANSITION_INVALID_EXPRESSION",
				{ sourceType: "grafcet-transition", sourceId: "test" },
				{},
				cause,
			);
			expect(issue.cause).toBe(cause);
		});

		it("defaults params to an empty object and cause to undefined", () => {
			const issue = new ProjectAnalyserIssue(
				"error",
				"GRAFCET_NO_INITIAL_STEP",
				{ sourceType: "grafcet", sourceId: "test" },
			);
			expect(issue.params).toEqual({});
			expect(issue.cause).toBeUndefined();
		});
	});
});
