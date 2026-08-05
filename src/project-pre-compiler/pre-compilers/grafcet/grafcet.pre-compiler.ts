import MemoVariableGenerator from "@/project-pre-compiler/memo-variable.generator";
import { PreCompiledProgram } from "@/project-pre-compiler/pre-compiled-program";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import { IdentifierNode } from "@/expression-language/ast/nodes/identifiers";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import SimulatorExceptionsMapper from "@/bridge/simulator-exceptions.mapper";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { Dialect } from "@/expression-language/dialect.enum";
import ProjectPreCompilerError, {
	ProjectPreCompilerErrorSourceBuilder,
} from "@/project-pre-compiler/project.pre-compiler.error";
import ActionPreCompiler, { PreCompiledAction } from "./action.pre-compiler";
import StepPreCompiler, { PreCompiledStep } from "./step.pre-compiler";
import TransitionPreCompiler, { PreCompiledTransition } from "./transition.pre-compiler";

/**
 * All compiled artifacts of a single Grafcet.
 * Keys are the original element ids from the schema.
 */
export type PreCompiledGrafcet = {
	type: "grafcet";
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

/**
 * Rétrécit un programme pré-compilé opaque vers sa forme GRAFCET.
 * C'est la notation qui fournit son garde de type : le niveau projet n'a pas à connaître
 * la forme du pré-compilé.
 */
export function isPreCompiledGrafcet(program: PreCompiledProgram): program is PreCompiledGrafcet {
	return program.type === "grafcet";
}

export default class GrafcetPreCompiler {
	static preCompile(
		grafcet: Grafcet,
		variables: PLCVariable[],
		dialect: Dialect,
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
					SimulatorExceptionsMapper.getUserFriendlyMessage(
						e,
						dialect === Dialect.EN ? "EN" : "FR",
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
					TransitionPreCompiler.preCompile(transition, grafcet, variables, dialect),
				);
			} catch (e) {
				const message =
					SimulatorExceptionsMapper.getUserFriendlyMessage(
						e,
						dialect === Dialect.EN ? "EN" : "FR",
					) || String(e);
				const source = ProjectPreCompilerErrorSourceBuilder.buildTransitionSource(transition.id);
				errors.push(
					e instanceof ProjectPreCompilerError ? e : new ProjectPreCompilerError(source, message),
				);
			}
		}

		for (const action of grafcet.actions) {
			try {
				const result = ActionPreCompiler.preCompile(action, grafcet, variables, dialect);
				if (!result) continue;
				actions.set(action.id, result);
			} catch (e) {
				const message =
					SimulatorExceptionsMapper.getUserFriendlyMessage(
						e,
						dialect === Dialect.EN ? "EN" : "FR",
					) || String(e);
				const source = ProjectPreCompilerErrorSourceBuilder.buildActionSource(action.id);
				errors.push(
					e instanceof ProjectPreCompilerError ? e : new ProjectPreCompilerError(source, message),
				);
			}
		}

		return { type: "grafcet", steps, stepsMemos, transitions, actions };
	}
}
