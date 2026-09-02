import StepHelper from "@/schemas/grafcet/helpers/step.helper";
import { Environment } from "@/simulator/interpreter/environment/environment";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Step, { STEP_HANDLE_SOURCE_SUCCESSOR } from "@/schemas/grafcet/step.schema";
import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import GrafcetElementAnalyser, {
	ElementAnalyseIsolatedOptions,
} from "./element.analyser";

export default class StepAnalyser extends GrafcetElementAnalyser<Step> {
	/**
	 * Rules that apply to the step's own data, independently of the grafcet.
	 */
	analyseIsolated(
		step: Step,
		{ allowEmptyContent = false }: ElementAnalyseIsolatedOptions = {},
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet-step" as const, sourceId: step.id };

		if (
			step.data.number === "" ||
			step.data.number === null ||
			step.data.number === undefined
		) {
			if (!allowEmptyContent) {
				issues.push(
					new ProjectAnalyserIssue("error", "STEP_NUMBER_MISSING", source),
				);
			}
			return issues;
		}
		if (!Number.isInteger(step.data.number) || step.data.number < 0) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"STEP_NUMBER_NOT_POSITIVE_INTEGER",
					source,
				),
			);
		}

		return issues;
	}

	/**
	 * Rules that require knowledge of the full grafcet.
	 */
	analyseInContext(
		step: Step,
		grafcet: Grafcet,
		_environment: Environment,
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet-step" as const, sourceId: step.id };

		// Step number must be unique within the grafcet
		const sameNumber = Object.values(grafcet.steps).filter(
			(s) =>
				s.id !== step.id &&
				s.data.number !== "" &&
				s.data.number === step.data.number,
		);
		if (sameNumber.length > 0) {
			issues.push(
				new ProjectAnalyserIssue("error", "STEP_NUMBER_DUPLICATE", source, {
					stepNumber: step.data.number as number,
				}),
			);
		}

		if (
			!StepHelper.hasPredecessor(step.id, grafcet) &&
			step.data.initial !== true
		) {
			//We allow only the initial step to have no predecessor, as it can can be activated through a step referral source
			issues.push(
				new ProjectAnalyserIssue("error", "STEP_NO_PREDECESSOR", source),
			);
		}

		if (!StepHelper.hasSuccessor(step.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue("error", "STEP_NO_SUCCESSOR", source),
			);
		}

		// Le handle « successeur » d'une étape n'accepte qu'une connexion (contrainte de
		// l'éditeur) : une sélection de séquence doit passer par un élément « divergence en
		// OU ». Plusieurs transitions branchées directement sur l'étape échappent à cette
		// contrainte quand le grafcet est construit par script ou importé.
		if (
			grafcet.getConnectionsByElementIdAndHandle(
				step.id,
				STEP_HANDLE_SOURCE_SUCCESSOR,
			).length > 1
		) {
			issues.push(
				new ProjectAnalyserIssue("error", "STEP_MULTIPLE_SUCCESSORS", source),
			);
		}

		return issues;
	}
}
