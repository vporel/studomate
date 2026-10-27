import ProjectAnalyserIssue, {
	type ProjectAnalyserIssueCode,
} from "@/project-analyser/project.analyser.issue";
import { DivisionByZeroException } from "@/expression-language/interpreter/exceptions/division-by-zero.exception";
import { Dialect } from "@/expression-language/dialect.enum";
import { Lexer } from "@/expression-language/lexer/lexer";
import Parser from "@/expression-language/parser/parser";
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
			issue(
				"TRANSITION_INVALID_EXPRESSION",
				{},
				new DivisionByZeroException(1, 0, {
					type: "NUMBER_LITERAL",
				} as never),
			),
		);
		const en = formatAnalysisIssue(
			issue(
				"TRANSITION_INVALID_EXPRESSION",
				{},
				new DivisionByZeroException(1, 0, {
					type: "NUMBER_LITERAL",
				} as never),
			),
			"en",
		);
		expect(fr).toContain("Division par zéro");
		expect(en).toContain("Division by zero");
		expect(fr).not.toBe("TRANSITION_INVALID_EXPRESSION");
	});

	it("suggère le changement de dialecte pour une expression écrite avec le mot-clé d'un autre dialecte", () => {
		let cause: unknown;
		try {
			new Parser(new Lexer(Dialect.FR).tokenize("a AND b")).parse();
		} catch (error) {
			cause = error;
		}

		const message = formatAnalysisIssue(
			issue("TRANSITION_INVALID_EXPRESSION", undefined, cause),
		);

		expect(message).toBe(
			"« AND » est un mot-clé du dialecte anglais. Écrivez ET ou changez le dialecte du projet dans ses propriétés.",
		);
	});
});
