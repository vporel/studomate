import MemoVariableGenerator from "@/project-pre-compiler/memo-variable.generator";
import IdentifiersBuilder from "@/simulator/compiler/ast/builders/identifiers.builder";
import { IdentifierNode } from "@/simulator/compiler/ast/nodes/identifiers";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import SimulatorExceptionsHelper from "../../../bridge/simulator-exceptions.helper";
import Grafcet from "../../../schemas/grafcet/grafcet.schema";
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
				steps.set(step.id, StepPreCompiler.preCompile(step));
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

		return { steps, stepsMemos, transitions, actions };
	}
}
