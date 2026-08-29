import {
	isTimeLiteral,
	parseTimeLiteral,
} from "@/expression-language/literals/time";
import ProjectAnalyserIssue, {
	ProjectAnalyserIssueCode,
	ProjectAnalyserIssueSource,
} from "@/project-analyser/project.analyser.issue";
import { BlockElement } from "@/schemas/ladder/block.schema";
import { validateBlockName } from "@/schemas/ladder/function-blocks/function-block.schema";
import Variable from "@/schemas/variable/variable.schema";
import { resolveFunctionBlockPin } from "./function-block-pin.resolver";

type PinCodes = {
	empty?: ProjectAnalyserIssueCode;
	invalidConstant?: ProjectAnalyserIssueCode;
	undeclaredVariable: ProjectAnalyserIssueCode;
	invalidType: ProjectAnalyserIssueCode;
};

/**
 * Validation propre à un bloc `"timer"` — pins PT/ET (voir `TimerBlockParams`) : PT est
 * obligatoire (constante `T#...` ou variable numérique/TIME existante), ET est optionnel mais
 * doit référencer une variable numérique/TIME existante si renseigné. Appelé par `BlockAnalyser`,
 * qui dispatche par `blockType`.
 */
export default class TimerBlockAnalyser {
	static analyse(
		element: BlockElement,
		source: ProjectAnalyserIssueSource,
		variablesByMnemonic: Map<string, Variable>,
	): ProjectAnalyserIssue[] {
		if (element.data.blockType !== "timer") return [];
		const { name, pt, et } = element.data.params;

		const issues: ProjectAnalyserIssue[] = [];
		if (validateBlockName(name).length > 0) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"BLOCK_TIMER_NAME_INVALID",
					source,
					`Le nom "${name}" de ce bloc tempo n'est pas valide.`,
				),
			);
		}
		issues.push(
			...this.validatePin(pt, "PT", true, source, variablesByMnemonic, {
				empty: "BLOCK_TIMER_PT_EMPTY",
				invalidConstant: "BLOCK_TIMER_PT_INVALID_CONSTANT",
				undeclaredVariable: "BLOCK_TIMER_PT_UNDECLARED_VARIABLE",
				invalidType: "BLOCK_TIMER_PT_INVALID_TYPE",
			}),
		);
		if (et) {
			issues.push(
				...this.validatePin(et, "ET", false, source, variablesByMnemonic, {
					undeclaredVariable: "BLOCK_TIMER_ET_UNDECLARED_VARIABLE",
					invalidType: "BLOCK_TIMER_ET_INVALID_TYPE",
				}),
			);
		}
		return issues;
	}

	/** `pin` est le contenu brut de le paramètre PT (constante `T#...` ou variable) ou ET (toujours
	 * une variable, jamais de constante). */
	private static validatePin(
		pin: string,
		pinName: "PT" | "ET",
		acceptsTimeLiteral: boolean,
		source: ProjectAnalyserIssueSource,
		variablesByMnemonic: Map<string, Variable>,
		codes: PinCodes,
	): ProjectAnalyserIssue[] {
		const resolution = resolveFunctionBlockPin(
			pin,
			variablesByMnemonic,
			"number",
			acceptsTimeLiteral
				? {
						isLiteralSyntax: isTimeLiteral,
						isLiteralValid: (p) => parseTimeLiteral(p) !== null,
					}
				: undefined,
		);
		switch (resolution.kind) {
			case "empty":
				if (!codes.empty) return []; // ET est optionnel
				return [
					new ProjectAnalyserIssue(
						"error",
						codes.empty,
						source,
						`Le paramètre ${pinName} de ce bloc doit être renseignée.`,
					),
				];
			case "literal":
				return [];
			case "invalid-constant":
				if (!codes.invalidConstant) return [];
				return [
					new ProjectAnalyserIssue(
						"error",
						codes.invalidConstant,
						source,
						`"${pin}" n'est pas une constante TIME valide (ex. T#5s, T#1h30m).`,
					),
				];
			case "undeclared":
				return [
					new ProjectAnalyserIssue(
						"error",
						codes.undeclaredVariable,
						source,
						`La variable "${pin}" référencée par le paramètre ${pinName} de ce bloc n'existe pas.`,
					),
				];
			case "invalid-type":
				return [
					new ProjectAnalyserIssue(
						"error",
						codes.invalidType,
						source,
						`La variable "${pin}" référencée par le paramètre ${pinName} de ce bloc doit être numérique ou TIME.`,
					),
				];
			case "ok":
				return [];
		}
	}
}
