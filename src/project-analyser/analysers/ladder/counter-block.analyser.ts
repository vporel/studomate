import { Dialect } from "@/expression-language/dialect.enum";
import { isBooleanLiteral } from "@/expression-language/literals/boolean";
import { isNumberLiteral } from "@/expression-language/literals/number";
import ProjectAnalyserIssue, {
	ProjectAnalyserIssueSource,
} from "@/project-analyser/project.analyser.issue";
import { BlockElement } from "@/schemas/ladder/block.schema";
import { validateBlockName } from "@/schemas/ladder/function-blocks/function-block.schema";
import Variable from "@/schemas/variable/variable.schema";
import { resolveFunctionBlockPin } from "./function-block-pin.resolver";

/**
 * Validation propre à un bloc `"counter"` — pins contrôle (R/LD, plus CD/LD/QD pour un CTUD), PV, CV (voir
 * `CounterBlockParams`) : contrôle et PV sont obligatoires, contrôle accepte un littéral booléen
 * (`vrai`/`faux`) et PV un littéral numérique en plus d'une variable ; CV est optionnel mais
 * doit référencer une variable numérique existante si renseigné. Appelé par `BlockAnalyser`, qui
 * dispatche par `blockType`.
 */
export default class CounterBlockAnalyser {
	static analyse(
		element: BlockElement,
		source: ProjectAnalyserIssueSource,
		dialect: Dialect,
		variablesByMnemonic: Map<string, Variable>,
	): ProjectAnalyserIssue[] {
		if (element.data.blockType !== "counter") return [];
		const { name, counterType, control, pv, cv, down, load, qd } =
			element.data.params;

		const issues: ProjectAnalyserIssue[] = [
			...this.validateControlPin(
				control,
				counterType === "CTD" ? "LD" : "R",
				source,
				dialect,
				variablesByMnemonic,
			),
			...this.validatePresetValuePin(pv, source, variablesByMnemonic),
		];
		if (counterType === "CTUD") {
			issues.push(
				...this.validateControlPin(
					down ?? "",
					"CD",
					source,
					dialect,
					variablesByMnemonic,
				),
				...this.validateControlPin(
					load ?? "",
					"LD",
					source,
					dialect,
					variablesByMnemonic,
				),
			);
			if (qd)
				issues.push(...this.validateQdPin(qd, source, variablesByMnemonic));
		}
		if (validateBlockName(name).length > 0) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"BLOCK_COUNTER_NAME_INVALID",
					source,
					{ blockName: name },
				),
			);
		}
		if (cv)
			issues.push(
				...this.validateCurrentValuePin(cv, source, variablesByMnemonic),
			);
		return issues;
	}

	private static validateControlPin(
		pin: string,
		pinName: string,
		source: ProjectAnalyserIssueSource,
		dialect: Dialect,
		variablesByMnemonic: Map<string, Variable>,
	): ProjectAnalyserIssue[] {
		const isBoolean = (value: string) => isBooleanLiteral(value, dialect);
		const resolution = resolveFunctionBlockPin(
			pin,
			variablesByMnemonic,
			"boolean",
			{ isLiteralSyntax: isBoolean, isLiteralValid: isBoolean },
		);
		switch (resolution.kind) {
			case "empty":
				return [
					new ProjectAnalyserIssue(
						"error",
						"BLOCK_COUNTER_CONTROL_EMPTY",
						source,
						{ pin: pinName },
					),
				];
			case "undeclared":
				return [
					new ProjectAnalyserIssue(
						"error",
						"BLOCK_COUNTER_CONTROL_UNDECLARED_VARIABLE",
						source,
						{ variableName: pin, pin: pinName },
					),
				];
			case "invalid-type":
				return [
					new ProjectAnalyserIssue(
						"error",
						"BLOCK_COUNTER_CONTROL_INVALID_TYPE",
						source,
						{ variableName: pin, pin: pinName },
					),
				];
			default:
				return [];
		}
	}

	private static validatePresetValuePin(
		pin: string,
		source: ProjectAnalyserIssueSource,
		variablesByMnemonic: Map<string, Variable>,
	): ProjectAnalyserIssue[] {
		const resolution = resolveFunctionBlockPin(
			pin,
			variablesByMnemonic,
			"number",
			{ isLiteralSyntax: isNumberLiteral, isLiteralValid: isNumberLiteral },
			["TIME"],
		);
		switch (resolution.kind) {
			case "empty":
				return [
					new ProjectAnalyserIssue("error", "BLOCK_COUNTER_PV_EMPTY", source),
				];
			case "undeclared":
				return [
					new ProjectAnalyserIssue(
						"error",
						"BLOCK_COUNTER_PV_UNDECLARED_VARIABLE",
						source,
						{ variableName: pin },
					),
				];
			case "invalid-type":
				return [
					new ProjectAnalyserIssue(
						"error",
						"BLOCK_COUNTER_PV_INVALID_TYPE",
						source,
						{ variableName: pin },
					),
				];
			default:
				return [];
		}
	}

	private static validateCurrentValuePin(
		pin: string,
		source: ProjectAnalyserIssueSource,
		variablesByMnemonic: Map<string, Variable>,
	): ProjectAnalyserIssue[] {
		const resolution = resolveFunctionBlockPin(
			pin,
			variablesByMnemonic,
			"number",
			undefined,
			["TIME"],
		);
		switch (resolution.kind) {
			case "undeclared":
				return [
					new ProjectAnalyserIssue(
						"error",
						"BLOCK_COUNTER_CV_UNDECLARED_VARIABLE",
						source,
						{ variableName: pin },
					),
				];
			case "invalid-type":
				return [
					new ProjectAnalyserIssue(
						"error",
						"BLOCK_COUNTER_CV_INVALID_TYPE",
						source,
						{ variableName: pin },
					),
				];
			default:
				return [];
		}
	}

	private static validateQdPin(
		pin: string,
		source: ProjectAnalyserIssueSource,
		variablesByMnemonic: Map<string, Variable>,
	): ProjectAnalyserIssue[] {
		const resolution = resolveFunctionBlockPin(
			pin,
			variablesByMnemonic,
			"boolean",
		);
		switch (resolution.kind) {
			case "undeclared":
				return [
					new ProjectAnalyserIssue(
						"error",
						"BLOCK_COUNTER_QD_UNDECLARED_VARIABLE",
						source,
						{ variableName: pin },
					),
				];
			case "invalid-type":
				return [
					new ProjectAnalyserIssue(
						"error",
						"BLOCK_COUNTER_QD_INVALID_TYPE",
						source,
						{ variableName: pin },
					),
				];
			default:
				return [];
		}
	}
}
