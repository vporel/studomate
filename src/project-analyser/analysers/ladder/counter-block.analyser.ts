import { isNumberLiteral } from "@/expression-language/literals/number";
import ProjectAnalyserIssue, {
	ProjectAnalyserIssueSource,
} from "@/project-analyser/project.analyser.issue";
import { BlockElement } from "@/schemas/ladder/block.schema";
import { validateBlockName } from "@/schemas/ladder/function-blocks/function-block.schema";
import Variable from "@/schemas/variable/variable.schema";
import { resolveFunctionBlockPin } from "./function-block-pin.resolver";

/**
 * Validation propre à un bloc `"counter"` — pins contrôle (R/LD), PV, CV (voir
 * `CounterBlockParams`) : contrôle et PV sont obligatoires, PV accepte un littéral numérique en
 * plus d'une variable (contrôle référence toujours une variable, jamais de littéral) ; CV est
 * optionnel mais doit référencer une variable numérique existante si renseigné. Appelé par
 * `BlockAnalyser`, qui dispatche par `blockType`.
 */
export default class CounterBlockAnalyser {
	static analyse(
		element: BlockElement,
		source: ProjectAnalyserIssueSource,
		variablesByMnemonic: Map<string, Variable>,
	): ProjectAnalyserIssue[] {
		if (element.data.blockType !== "counter") return [];
		const { name, control, pv, cv } = element.data.params;

		const issues: ProjectAnalyserIssue[] = [
			...this.validateControlPin(control, source, variablesByMnemonic),
			...this.validatePresetValuePin(pv, source, variablesByMnemonic),
		];
		if (validateBlockName(name).length > 0) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"BLOCK_COUNTER_NAME_INVALID",
					source,
					`Le nom "${name}" de ce bloc n'est pas valide.`,
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
		source: ProjectAnalyserIssueSource,
		variablesByMnemonic: Map<string, Variable>,
	): ProjectAnalyserIssue[] {
		const resolution = resolveFunctionBlockPin(
			pin,
			variablesByMnemonic,
			"boolean",
		);
		switch (resolution.kind) {
			case "empty":
				return [
					new ProjectAnalyserIssue(
						"error",
						"BLOCK_COUNTER_CONTROL_EMPTY",
						source,
						"Le paramètre de remise à zéro/chargement (R/LD) doit être renseignée.",
					),
				];
			case "undeclared":
				return [
					new ProjectAnalyserIssue(
						"error",
						"BLOCK_COUNTER_CONTROL_UNDECLARED_VARIABLE",
						source,
						`La variable "${pin}" référencée par le paramètre de remise à zéro/chargement (R/LD) n'existe pas.`,
					),
				];
			case "invalid-type":
				return [
					new ProjectAnalyserIssue(
						"error",
						"BLOCK_COUNTER_CONTROL_INVALID_TYPE",
						source,
						`La variable "${pin}" référencée par le paramètre de remise à zéro/chargement (R/LD) doit être booléenne.`,
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
					new ProjectAnalyserIssue(
						"error",
						"BLOCK_COUNTER_PV_EMPTY",
						source,
						"Le paramètre PV de ce bloc doit être renseignée.",
					),
				];
			case "undeclared":
				return [
					new ProjectAnalyserIssue(
						"error",
						"BLOCK_COUNTER_PV_UNDECLARED_VARIABLE",
						source,
						`La variable "${pin}" référencée par le paramètre PV de ce bloc n'existe pas.`,
					),
				];
			case "invalid-type":
				return [
					new ProjectAnalyserIssue(
						"error",
						"BLOCK_COUNTER_PV_INVALID_TYPE",
						source,
						`La variable "${pin}" référencée par le paramètre PV de ce bloc doit être numérique.`,
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
						`La variable "${pin}" référencée par le paramètre CV de ce bloc n'existe pas.`,
					),
				];
			case "invalid-type":
				return [
					new ProjectAnalyserIssue(
						"error",
						"BLOCK_COUNTER_CV_INVALID_TYPE",
						source,
						`La variable "${pin}" référencée par le paramètre CV de ce bloc doit être numérique.`,
					),
				];
			default:
				return [];
		}
	}
}
