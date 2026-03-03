import MemoVariableGenerator from "@/project-pre-compiler/memo-variable.generator";
import IdentifiersBuilder from "@/simulator/compiler/ast/builders/identifiers.builder";
import { IdentifierNode } from "@/simulator/compiler/ast/nodes/identifiers";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import SimulatorExceptionsHelper from "../../../bridge/simulator-exceptions.helper";
import Grafcet from "../../../schemas/grafcet/grafcet.schema";
import JunctionOrStartHelper from "../../../schemas/grafcet/helpers/junction-or-start.helper";
import { Language } from "../../../simulator/compiler/lexer/language.enum";
import ProjectPreCompilerError, {
	ProjectPreCompilerErrorSourceBuilder,
} from "../../project.pre-compiler.error";
import ActionPreCompiler, { PreCompiledAction } from "./action.pre-compiler";
import StepPreCompiler, { PreCompiledStep } from "./step.pre-compiler";
import TransitionPreCompiler, { PreCompiledTransition } from "./transition.pre-compiler";

/**
 * All compiled artifacts of a single Grafcet.
 * Keys are the original element ids from the schema.
 */
export type PreCompiledGrafcet = {
	steps: Map<string, PreCompiledStep>;
	stepsMemos: Map<
		string,
		{
			variable: PLCVariable;
			node: IdentifierNode;
		}
	>;
	transitions: Map<string, PreCompiledTransition>;
	actions: Map<string, PreCompiledAction | undefined | null>; //Some actions can be null if they are of type TEXT (purely descriptive, no runtime effect)
};

export default class GrafcetPreCompiler {
	static preCompile(
		grafcet: Grafcet,
		variables: PLCVariable[],
		language: Language,
		errors: ProjectPreCompilerError[],
	): PreCompiledGrafcet {
		const steps: PreCompiledGrafcet["steps"] = new Map();
		const stepsMemos: PreCompiledGrafcet["stepsMemos"] = new Map();
		const transitions: PreCompiledGrafcet["transitions"] = new Map();
		const actions: PreCompiledGrafcet["actions"] = new Map();

		const takenVariablesNames = new Set(variables.map((v) => v.getName()));
		for (const step of grafcet.steps) {
			try {
				steps.set(step.id, StepPreCompiler.preCompile(step, grafcet));
				const generatedMemoVar = MemoVariableGenerator.generate("boolean", takenVariablesNames);
				stepsMemos.set(step.id, {
					variable: generatedMemoVar,
					node: IdentifiersBuilder.buildIdentifierNode(generatedMemoVar.getName()),
				});
				takenVariablesNames.add(generatedMemoVar.getName());
				variables.push(generatedMemoVar);
			} catch (e) {
				const message =
					SimulatorExceptionsHelper.getUserFriendlyMessage(
						e,
						language === Language.EN ? "EN" : "FR",
					) || String(e);
				const source = ProjectPreCompilerErrorSourceBuilder.buildStepSource(step.id);
				errors.push(
					e instanceof ProjectPreCompilerError ? e : new ProjectPreCompilerError(source, message),
				);
			}
		}

		for (const transition of grafcet.transitions) {
			try {
				transitions.set(
					transition.id,
					TransitionPreCompiler.preCompile(transition, grafcet, variables, language),
				);
			} catch (e) {
				const message =
					SimulatorExceptionsHelper.getUserFriendlyMessage(
						e,
						language === Language.EN ? "EN" : "FR",
					) || String(e);
				const source = ProjectPreCompilerErrorSourceBuilder.buildTransitionSource(transition.id);
				errors.push(
					e instanceof ProjectPreCompilerError ? e : new ProjectPreCompilerError(source, message),
				);
			}
		}

		for (const action of grafcet.actions) {
			try {
				const result = ActionPreCompiler.preCompile(action, grafcet, variables, language);
				if (!result) continue;
				actions.set(action.id, result);
			} catch (e) {
				const message =
					SimulatorExceptionsHelper.getUserFriendlyMessage(
						e,
						language === Language.EN ? "EN" : "FR",
					) || String(e);
				const source = ProjectPreCompilerErrorSourceBuilder.buildActionSource(action.id);
				errors.push(
					e instanceof ProjectPreCompilerError ? e : new ProjectPreCompilerError(source, message),
				);
			}
		}

		this.populateOrDivergencePriorityExclusions(grafcet, steps);
		return { steps, stepsMemos, transitions, actions };
	}

	/**
	 * For each JunctionOrStart with ≥2 branches, populates orDivergencePriorityExclusions on each
	 * step so that, when multiple branch conditions are simultaneously true, only the leftmost
	 * (lowest branch index) eligible branch activates.
	 */
	private static populateOrDivergencePriorityExclusions(
		grafcet: Grafcet,
		steps: PreCompiledGrafcet["steps"],
	): void {
		for (const junctionOrStart of grafcet.junctionsOrStarts) {
			const orderedTransitionIds = JunctionOrStartHelper.getSuccessorTransitionsByBranchOrder(
				junctionOrStart.id,
				grafcet,
			)
				.filter((t) => t !== null)
				.map((t) => t!.id);

			if (orderedTransitionIds.length < 2) continue;

			const pivotStep = JunctionOrStartHelper.getPredecessorStep(junctionOrStart.id, grafcet);
			if (!pivotStep) continue;

			//The first branch (index 0) has no priority exclusions,
			// it activates whenever its condition is true.
			//We ensure that each subsequent branch (index i)
			//only activates when its own condition is true AND all prior branches'
			// conditions (0 to i-1) are false, by adding all prior branches'
			// conditions as exclusions to its steps.
			for (let i = 1; i < orderedTransitionIds.length; i++) {
				const branchTransitionId = orderedTransitionIds[i];
				const priorTransitionIds = orderedTransitionIds.slice(0, i);

				for (const preCompiledStep of steps.values()) {
					const hasBranch = preCompiledStep.branches.some(
						(b) => b.transitionId === branchTransitionId,
					);
					if (!hasBranch) continue;

					preCompiledStep.orDivergencePriorityExclusions.push(
						...priorTransitionIds.map((transId) => ({
							transitionId: transId,
							stepsIdsBeforeTransition: [pivotStep.id],
						})),
					);
					// No break: multiple steps can share the same transitionId when the branch
					// goes through an AND junction (getPredecessorBranches flattens through it).
				}
			}
		}
	}
}
