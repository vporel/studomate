import SimulatorExceptionsHelper from "../../../bridge/simulator-exceptions.helper";
import Grafcet from "../../../schemas/grafcet/grafcet.schema";
import { Language } from "../../../simulator/compiler/lexer/language.enum";
import { PLCVariable } from "../../../simulator/core/plc/plc";
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
	steps: Record<string, PreCompiledStep>;
	transitions: Record<string, PreCompiledTransition>;
	actions: Record<string, PreCompiledAction | undefined>; //Some actions can be null if they are of type TEXT (purely descriptive, no runtime effect)
};

export default class GrafcetPreCompiler {
	static preCompile(
		grafcet: Grafcet,
		plcVariables: PLCVariable[],
		language: Language,
		errors: ProjectPreCompilerError[],
	): PreCompiledGrafcet {
		const steps: PreCompiledGrafcet["steps"] = {};
		const transitions: PreCompiledGrafcet["transitions"] = {};
		const actions: PreCompiledGrafcet["actions"] = {};

		for (const step of grafcet.steps) {
			try {
				steps[step.id] = StepPreCompiler.preCompile(step, grafcet);
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
				transitions[transition.id] = TransitionPreCompiler.preCompile(transition, grafcet, language);
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
				const result = ActionPreCompiler.preCompile(action, grafcet, plcVariables, language);
				if (!result) continue;
				actions[action.id] = result;
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

		return { steps, transitions, actions };
	}
}
