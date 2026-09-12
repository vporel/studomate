import MemoVariableGenerator from "@/project-pre-compiler/memo-variable.generator";
import { PreCompiledProgram } from "@/project-pre-compiler/pre-compiled-program";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import { IdentifierNode } from "@/expression-language/ast/nodes/identifiers";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { Dialect } from "@/expression-language/dialect.enum";
import ProjectPreCompilerError, {
	ProjectPreCompilerErrorSourceBuilder,
} from "@/project-pre-compiler/project.pre-compiler.error";
import ActionPreCompiler, { PreCompiledAction } from "./action.pre-compiler";
import StepPreCompiler, { PreCompiledStep } from "./step.pre-compiler";
import TransitionPreCompiler, {
	PreCompiledTransition,
} from "./transition.pre-compiler";

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
	/**
	 * Une variable de mémoire booléenne par transition, destinée à porter l'état de la
	 * réceptivité **seule** (indépendamment de l'activité des étapes amont) pour l'affichage.
	 * `node` est la réceptivité pré-compilée où chaque `TimerNode` est remplacé par une lecture
	 * de sa variable de sortie : la logique de franchissement a déjà fait avancer la tempo ce
	 * cycle-ci, l'observation ne fait que lire le résultat (pas de double avance).
	 */
	transitionObservations: Map<string, { variable: PLCVariable; node: ASTNode }>;
};

/**
 * Rétrécit un programme pré-compilé opaque vers sa forme GRAFCET.
 * C'est la notation qui fournit son garde de type : le niveau projet n'a pas à connaître
 * la forme du pré-compilé.
 */
export function isPreCompiledGrafcet(
	program: PreCompiledProgram,
): program is PreCompiledGrafcet {
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
		for (const step of Object.values(grafcet.steps)) {
			try {
				steps.set(step.id, StepPreCompiler.preCompile(step));
				const generatedMemoVar = MemoVariableGenerator.generate(
					"boolean",
					takenVariablesNames,
				);
				stepsMemos.set(step.id, {
					variable: generatedMemoVar,
					node: IdentifiersBuilder.buildIdentifierNode(
						generatedMemoVar.getName(),
					),
				});
				takenVariablesNames.add(generatedMemoVar.getName());
				variables.push(generatedMemoVar);
			} catch (e) {
				const message = e instanceof Error ? e.message : String(e);
				const source = ProjectPreCompilerErrorSourceBuilder.buildStepSource(
					step.id,
				);
				errors.push(
					e instanceof ProjectPreCompilerError
						? e
						: new ProjectPreCompilerError(source, message, e),
				);
			}
		}

		for (const transition of Object.values(grafcet.transitions)) {
			try {
				transitions.set(
					transition.id,
					TransitionPreCompiler.preCompile(
						transition,
						grafcet,
						variables,
						dialect,
					),
				);
			} catch (e) {
				const message = e instanceof Error ? e.message : String(e);
				const source =
					ProjectPreCompilerErrorSourceBuilder.buildTransitionSource(
						transition.id,
					);
				errors.push(
					e instanceof ProjectPreCompilerError
						? e
						: new ProjectPreCompilerError(source, message, e),
				);
			}
		}

		for (const action of Object.values(grafcet.actions)) {
			try {
				const result = ActionPreCompiler.preCompile(
					action,
					grafcet,
					variables,
					dialect,
				);
				if (!result) continue;
				actions.set(action.id, result);
			} catch (e) {
				const message = e instanceof Error ? e.message : String(e);
				const source = ProjectPreCompilerErrorSourceBuilder.buildActionSource(
					action.id,
				);
				errors.push(
					e instanceof ProjectPreCompilerError
						? e
						: new ProjectPreCompilerError(source, message, e),
				);
			}
		}

		const transitionObservations: PreCompiledGrafcet["transitionObservations"] =
			new Map();
		//Reconstruit l'ensemble des noms pris : `TransitionPreCompiler` a poussé ses propres
		//mémos de tempo dans `variables` sans les ajouter à `takenVariablesNames`.
		const takenObservationNames = new Set(variables.map((v) => v.getName()));
		for (const [transitionId, preCompiledTransition] of transitions) {
			const observationVar = MemoVariableGenerator.generate(
				"boolean",
				takenObservationNames,
			);
			takenObservationNames.add(observationVar.getName());
			variables.push(observationVar);
			transitionObservations.set(transitionId, {
				variable: observationVar,
				node: preCompiledTransition.pureNode,
			});
		}

		return {
			type: "grafcet",
			steps,
			stepsMemos,
			transitions,
			actions,
			transitionObservations,
		};
	}
}
