import ProjectAnalyserIssue, {
	ProjectAnalyserIssueCode,
	ProjectAnalyserIssueSource,
} from "@/project-analyser/project.analyser.issue";
import { isTimeLiteral, parseTimeLiteral } from "@/expression-language/time-literal";
import { BlockElement } from "@/schemas/ladder/block.schema";
import Variable from "@/schemas/variable/variable.schema";

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
		const { pt, et } = element.data.params;

		const issues: ProjectAnalyserIssue[] = [];
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

	/** `pin` est le contenu brut de la pinoche PT (constante `T#...` ou variable) ou ET (toujours
	 * une variable, jamais de constante). */
	private static validatePin(
		pin: string,
		pinName: "PT" | "ET",
		acceptsTimeLiteral: boolean,
		source: ProjectAnalyserIssueSource,
		variablesByMnemonic: Map<string, Variable>,
		codes: PinCodes,
	): ProjectAnalyserIssue[] {
		if (!pin) {
			if (!codes.empty) return []; // ET est optionnel
			return [
				new ProjectAnalyserIssue(
					"error",
					codes.empty,
					source,
					`La pinoche ${pinName} de ce bloc tempo doit être renseignée.`,
				),
			];
		}
		if (acceptsTimeLiteral && isTimeLiteral(pin)) {
			if (parseTimeLiteral(pin) === null && codes.invalidConstant) {
				return [
					new ProjectAnalyserIssue(
						"error",
						codes.invalidConstant,
						source,
						`"${pin}" n'est pas une constante TIME valide (ex. T#5s, T#1h30m).`,
					),
				];
			}
			return [];
		}

		const variable = variablesByMnemonic.get(pin);
		if (!variable) {
			return [
				new ProjectAnalyserIssue(
					"error",
					codes.undeclaredVariable,
					source,
					`La variable "${pin}" référencée par la pinoche ${pinName} de ce bloc tempo n'existe pas.`,
				),
			];
		}
		if (variable.getNativeType() !== "number") {
			return [
				new ProjectAnalyserIssue(
					"error",
					codes.invalidType,
					source,
					`La variable "${pin}" référencée par la pinoche ${pinName} de ce bloc tempo doit être numérique ou TIME.`,
				),
			];
		}
		return [];
	}
}
