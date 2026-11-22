import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import type ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import { createTranslator } from "next-intl";
import type { VariableValidationIssue } from "@/schemas/variable/variable.validator";
import SimulatorExceptionsMapper from "./simulator-exceptions.mapper";

function isVariableValidationIssue(
	cause: unknown,
): cause is VariableValidationIssue {
	return (
		typeof cause === "object" &&
		cause !== null &&
		!(cause instanceof Error) &&
		typeof (cause as VariableValidationIssue).code === "string"
	);
}

/**
 * Rend le message lisible d'une `ProjectAnalyserIssue` dans la langue demandée.
 *
 * L'analyseur (couche domaine) ne produit jamais de texte : il décrit le problème par un `code`
 * stable et des `params`. Le texte vit dans `src/i18n/messages/{fr,en}/analysisIssues.json`
 * (clé = code, placeholders ICU). Les codes `*_INVALID_EXPRESSION` portent une `cause` (exception
 * du lexer/parser/analyse sémantique) dont le message est produit par `SimulatorExceptionsMapper` ;
 * `PROJECT_VARIABLE_INVALID` porte une raison de validation de variable, rendue depuis
 * `variableValidation.json`.
 */
export function formatAnalysisIssue(
	issue: ProjectAnalyserIssue,
	locale: Locale = DEFAULT_LOCALE,
): string {
	const t = createTranslator({
		locale,
		messages: getMessages(locale),
		namespace: "analysisIssues",
	});

	const values: Record<string, string | number> = { ...issue.params };
	if (isVariableValidationIssue(issue.cause)) {
		values.detail = createTranslator({
			locale,
			messages: getMessages(locale),
			namespace: "variableValidation",
		})(issue.cause.code, issue.cause.params ?? {});
	} else if (issue.cause !== undefined) {
		values.detail = SimulatorExceptionsMapper.getUserFriendlyMessage(
			issue.cause,
			locale,
		);
	}

	return t(issue.code, values);
}
