import ProjectAnalyserIssue, {
	type ProjectAnalyserIssueCode,
} from "@/project-analyser/project.analyser.issue";
import { DivisionByZeroException } from "@/expression-language/interpreter/exceptions/division-by-zero.exception";
import { formatAnalysisIssue } from "./analysis-issue-formatter";

function issue(
	code: ProjectAnalyserIssueCode,
	params?: Record<string, string | number>,
	cause?: unknown,
) {
	return new ProjectAnalyserIssue(
		"error",
		code,
		{ sourceType: "grafcet", sourceId: "g" },
		params,
		cause,
	);
}

describe("formatAnalysisIssue", () => {
	it("rend le message français par défaut", () => {
		expect(formatAnalysisIssue(issue("GRAFCET_NO_INITIAL_STEP"))).toBe(
			"Le grafcet ne contient aucune étape initiale.",
		);
	});

	it("rend le message anglais quand la locale est en", () => {
		expect(formatAnalysisIssue(issue("GRAFCET_NO_INITIAL_STEP"), "en")).toBe(
			"The grafcet has no initial step.",
		);
	});

	it("interpole les paramètres du code", () => {
		expect(
			formatAnalysisIssue(issue("STEP_NUMBER_DUPLICATE", { stepNumber: 4 })),
		).toContain("4");
	});

	it("rend le message de l'exception pour les codes *_INVALID_EXPRESSION", () => {
		const fr = formatAnalysisIssue(
			issue("TRANSITION_INVALID_EXPRESSION", {}, new DivisionByZeroException(1, 0, {
				type: "NUMBER_LITERAL",
			} as never)),
		);
		const en = formatAnalysisIssue(
			issue("TRANSITION_INVALID_EXPRESSION", {}, new DivisionByZeroException(1, 0, {
				type: "NUMBER_LITERAL",
			} as never)),
			"en",
		);
		expect(fr).toContain("Division par zéro");
		expect(en).toContain("Division by zero");
		expect(fr).not.toBe("TRANSITION_INVALID_EXPRESSION");
	});
});
