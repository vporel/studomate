import ProjectAnalyserIssue from "./project.analyser.issue";

describe("ProjectAnalyserIssue", () => {
	describe("constructor", () => {
		it("creates an error issue", () => {
			const issue = new ProjectAnalyserIssue(
				"error",
				{ sourceType: "grafcet", sourceId: "grafcet-1" },
				"Test error message",
			);

			expect(issue.severity).toBe("error");
			expect(issue.source.sourceType).toBe("grafcet");
			expect(issue.source.sourceId).toBe("grafcet-1");
			expect(issue.message).toBe("Test error message");
		});

		it("creates a warning issue", () => {
			const issue = new ProjectAnalyserIssue(
				"warning",
				{ sourceType: "grafcet-step", sourceId: "step-1" },
				"Test warning message",
			);

			expect(issue.severity).toBe("warning");
			expect(issue.source.sourceType).toBe("grafcet-step");
			expect(issue.source.sourceId).toBe("step-1");
			expect(issue.message).toBe("Test warning message");
		});

		it("creates issue with parent ID", () => {
			const issue = new ProjectAnalyserIssue(
				"error",
				{ sourceType: "grafcet-transition", sourceId: "transition-1", parentId: "grafcet-1" },
				"Test message with parent",
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
					{ sourceType, sourceId: "test-id" },
					"Test message",
				);
				expect(issue.source.sourceType).toBe(sourceType);
			});
		});
	});

	describe("severity types", () => {
		it("supports error severity", () => {
			const issue = new ProjectAnalyserIssue(
				"error",
				{ sourceType: "grafcet", sourceId: "test" },
				"Error",
			);
			expect(issue.severity).toBe("error");
		});

		it("supports warning severity", () => {
			const issue = new ProjectAnalyserIssue(
				"warning",
				{ sourceType: "grafcet", sourceId: "test" },
				"Warning",
			);
			expect(issue.severity).toBe("warning");
		});
	});

	describe("message content", () => {
		it("stores exact message text", () => {
			const message = "Le grafcet ne contient aucune étape initiale.";
			const issue = new ProjectAnalyserIssue(
				"error",
				{ sourceType: "grafcet", sourceId: "test" },
				message,
			);
			expect(issue.message).toBe(message);
		});

		it("handles multiline messages", () => {
			const message = "Line 1\nLine 2\nLine 3";
			const issue = new ProjectAnalyserIssue(
				"error",
				{ sourceType: "grafcet", sourceId: "test" },
				message,
			);
			expect(issue.message).toBe(message);
		});

		it("handles empty message", () => {
			const issue = new ProjectAnalyserIssue("error", { sourceType: "grafcet", sourceId: "test" }, "");
			expect(issue.message).toBe("");
		});
	});
});
