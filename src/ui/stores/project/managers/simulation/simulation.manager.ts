import AnalysisIssuesMapper from "@/bridge/analysis-issues.mapper";
import ProjectAnalyser, { ProjectAnalysisResult } from "@/project-analyser/project.analyser";
import ProjectCompiler, { ProjectCompilationResult } from "@/project-compiler/project.compiler";
import ProjectPreCompiler from "@/project-pre-compiler/project.pre-compiler";
import VariablesMapper from "@/simulator/bridge/variables.mapper";
import { ASTNode } from "@/simulator/compiler/ast/nodes/ast-node";
import { Environment } from "@/simulator/compiler/environment/environment";
import EvaluatorVisitor from "@/simulator/compiler/interpreter/evaluator/evaluator.visitor";
import PLC from "@/simulator/core/plc/plc";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import { toast } from "react-toastify";
import {
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
	SimulationVariableState,
} from "../../project.store";
import { ProjectMode } from "../../ProjectMode.enum";

export type AnalysisGrafcetIssues = {
	overall: string[];
	elements: Record<string, string[]>;
};

export type AnalysisIssues = {
	grafcets: Record<string, AnalysisGrafcetIssues>;
};

export function emptyAnalysisIssues(): AnalysisIssues {
	return {
		grafcets: {},
	};
}

export default class SimulationManager {
	private setStoreState: ProjectStoreSetFunction;
	private getStoreState: ProjectStoreGetFunction;

	private plc: PLC | null = null;

	/**
	 * Any expression can be registered to be evaluated during simulation
	 * This functionality will be used ot show for example if a transition expression is currently true or false
	 * These expression are not evaluated in the simulator context, but in the simulation manager
	 * The expressions are registered by the simulation manager
	 * and the values can be retrieved in the UI using the expression id
	 * For a transition, the expression id is the transition id
	 * The value can be undefined if the plc has not started or if an error occurs during the evaluation
	 */
	private evaluableExpressions: Record<string, ASTNode> = {};

	/*
	 * The value can be undefined if the plc has not started or if an error occurs during the evaluation
	 */
	private evaluableExpressionsValues: Record<string, any | undefined> = {};

	constructor(setStoreState: ProjectStoreSetFunction, getStoreState: ProjectStoreGetFunction) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	/**
	 *
	 * @returns true if no error
	 */
	analyze(): {
		ok: boolean;
		projectAnalysisResult: ProjectAnalysisResult | null;
	} {
		const project = this.getStoreState().project;
		if (!project) return { ok: false, projectAnalysisResult: null };
		const projectAnalysisResult = ProjectAnalyser.analyse(project);
		const errors = projectAnalysisResult.issues.filter((i) => i.severity === "error");
		const warnings = projectAnalysisResult.issues.filter((i) => i.severity === "warning");

		const pluralTotal = projectAnalysisResult.totalAnalysedElements > 1;
		const pluralErrors = errors.length > 1;
		const pluralWarnings = warnings.length > 1;
		const toastFunction =
			errors.length > 0 ? toast.error : warnings.length > 0 ? toast.warn : toast.success;

		toastFunction(
			`Analyse terminée : ${projectAnalysisResult.totalAnalysedElements} élément${pluralTotal ? "s" : ""} analysé${pluralTotal ? "s" : ""}, 
				${errors.length === 0 ? "aucune" : errors.length} erreur${pluralErrors ? "s" : ""} et 
				${warnings.length === 0 ? "aucun" : warnings.length} avertissement${pluralWarnings ? "s" : ""} trouvé${errors.length + warnings.length > 1 ? "s" : ""}.`,
		);

		this.setStoreState(() => ({
			analysisHasErrors: errors.length > 0,
			analysisHasWarnings: warnings.length > 0,
			analysisErrors: AnalysisIssuesMapper.analyserToApp(errors),
			analysisWarnings: AnalysisIssuesMapper.analyserToApp(warnings),
			analysisResultVisible: errors.length > 0 || warnings.length > 0,
		}));

		return { ok: errors.length === 0, projectAnalysisResult };
	}

	setDesignMode() {
		this.stopSimulation();
		this.setStoreState(() => ({ mode: ProjectMode.DESIGN }));
	}

	setSimulationMode() {
		const project = this.getStoreState().project;
		if (!project) return;

		//Reanalyze project when switching to simulation mode
		const { ok: analysisOK, projectAnalysisResult } = this.analyze();
		if (!analysisOK || !projectAnalysisResult) return;

		//Pre compile the project
		const projectPreCompilationResult = ProjectPreCompiler.preCompile(
			project,
			projectAnalysisResult.stepsVariables,
		);
		if (projectPreCompilationResult.errors.length > 0) {
			toast.error(
				`Impossible de lancer la simulation : ${projectPreCompilationResult.errors.length} erreur${projectPreCompilationResult.errors.length > 1 ? "s" : ""} lors de la pré-compilation.`,
			);
			console.error("Errors during project pre-compilation:", projectPreCompilationResult.errors);
			return;
		}

		//We register each transition expression to be evaluated during simulation,
		// with the transition id as expression id
		this.evaluableExpressions = {};
		Object.values(projectPreCompilationResult.result!.grafcets).forEach((g) =>
			g.transitions.entries().forEach(([transitionId, transition]) => {
				//We use the pre-compiled transition
				//Which is already an analysed an simplified AST node
				this.evaluableExpressions[transitionId] = transition.node;
			}),
		);

		//Compile the project
		const projectCompilationResult = ProjectCompiler.compile(projectPreCompilationResult.result!);
		if (projectCompilationResult.errors.length > 0) {
			toast.error(
				`Impossible de lancer la simulation : ${projectCompilationResult.errors.length} erreur${projectCompilationResult.errors.length > 1 ? "s" : ""} lors de la compilation.`,
			);
			console.error("Errors during project compilation:", projectCompilationResult.errors);
			return;
		}
		toast.success("Compilation terminée, lancement de la simulation...");

		//Create a PLC instance
		this.plc = this.createPLC(projectCompilationResult);
		this.plc.start();

		//Set the mode
		this.setStoreState(() => ({ mode: ProjectMode.SIMULATION }));
	}

	private createPLC(projectCompilationResult: ProjectCompilationResult): PLC {
		if (!projectCompilationResult.result) {
			throw new Error("No compiled project result provided");
		}
		if (!projectCompilationResult.result.routines || !projectCompilationResult.result.variables) {
			throw new Error("Compiled project result must include routines and variables");
		}
		const scanTimeMs = this.getStoreState().plcConfig.scanTimeMs;
		if (!scanTimeMs || scanTimeMs <= 0) {
			throw new Error("Invalid PLC scan time configuration");
		}
		const plc = new PLC({
			scanTimeMs,
			program: projectCompilationResult.result!.routines,
			variables: projectCompilationResult.result!.variables,
			onCycleEnd: (plcInstance) => {
				const variablesSnapshot = plcInstance.getVariablesSnapshot();
				const variablesState: Record<string, SimulationVariableState> = {};
				variablesSnapshot.forEach((v) => {
					variablesState[v.getId()] = {
						id: v.getId(),
						mnemonic: v.getName(),
						value: v.getValue(),
					};
				});
				this.evaluationExpressions(variablesSnapshot);
				this.setStoreState(() => ({
					simulationVariablesStates: variablesState,
				}));
			},
			onCycleError: (error) => {
				toast.error(`Arrêt de la simulation. Erreur lors de l'exécution du cycle PLC.`);
				this.setDesignMode();
			},
		});
		return plc;
	}

	private evaluationExpressions(plcVariablesSnapshot: readonly PLCVariable[]): void {
		//Create an environment with the current PLC variables values
		const environment = new Environment(plcVariablesSnapshot.map(VariablesMapper.plcToEnv));
		Object.entries(this.evaluableExpressions).forEach(([expressionId, expressionNode]) => {
			try {
				const evaluator = new EvaluatorVisitor(environment, {
					timers: {
						deltaTimeMs: this.getStoreState().plcConfig.scanTimeMs,
					},
				});
				const value = evaluator.visit(expressionNode);
				this.evaluableExpressionsValues[expressionId] = value;
			} catch (e) {
				this.evaluableExpressionsValues[expressionId] = undefined;
				console.error(`Error evaluating expression ${expressionId}:`, e);
			}
		});
	}

	public getEvaluableExpressionValue(expressionId: string): any | undefined {
		return this.evaluableExpressionsValues[expressionId];
	}

	private stopSimulation(): void {
		//Stop the PLC if it is running
		if (this.plc) {
			this.plc.stop();
			this.plc = null;
		}

		//Reset simulation variables states
		this.setStoreState(() => ({
			simulationVariablesStates: {},
		}));

		//Reset evaluable expressions values
		this.evaluableExpressionsValues = {};
	}

	public setPhysicalInputValue(variableId: string, value: any): void {
		const mode = this.getStoreState().mode;
		if (mode !== ProjectMode.SIMULATION) {
			throw new Error("Cannot set physical input value when not in simulation mode");
		}
		if (!this.plc) {
			throw new Error("PLC instance is not initialized");
		}
		this.plc.setPhysicalInputValueById(variableId, value);
	}
}
