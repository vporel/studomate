import { ActionExecutionMode, ActionType } from "@/schemas/grafcet/action.schema";
import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import { VariableFactory } from "@tests/utils/variable-factory";
import { ProjectStoreState } from "@/ui/stores/project/project.store";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import SimulationManager from "./simulation.manager";
import SimulationNotifier from "./simulation.notifier";

function stubNotifier(): SimulationNotifier {
	return {
		analysisCompleted: jest.fn(),
		simulationStarting: jest.fn(),
		simulationCouldNotStart: jest.fn(),
		simulationCrashed: jest.fn(),
	};
}

/**
 * État minimal touché par SimulationManager, avec un `set`/`get` en mémoire — pas de zustand,
 * pour rester un test de logique plutôt qu'un test d'intégration du store.
 */
function makeStore(project: ReturnType<typeof ProjectFactory.create>) {
	let state = {
		project,
		mode: ProjectMode.DESIGN,
		plcConfig: { scanTimeMs: 10 },
		ui: { watchTablesVisible: false, analysisResultVisible: false },
		simulationVariablesStates: {},
		evaluableExpressionsValues: {},
		forcedVariables: {},
		analysisHasErrors: false,
		analysisHasWarnings: false,
		analysisErrors: { project: [], grafcets: {} },
		analysisWarnings: { project: [], grafcets: {} },
		hmiManager: { openHmiSimulationPageIfAny: jest.fn(), closeHmiSimulationPage: jest.fn() },
	} as unknown as ProjectStoreState;

	const set = (partial: any) => {
		const patch = typeof partial === "function" ? partial(state) : partial;
		state = { ...state, ...patch } as ProjectStoreState;
	};
	const get = () => state;
	return { get, set };
}

describe("SimulationManager", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		VariableFactory.reset();
		ProjectFactory.reset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	// Régression §2.7 : les valeurs observées vivaient dans une classe mutée hors du store,
	// et n'atteignaient l'interface que par effet de bord (simulationVariablesStates changeant
	// en même temps). Elles doivent être un vrai morceau d'état réactif.
	describe("valeurs des expressions observées pendant la simulation", () => {
		it("publie les valeurs dans l'état du store, pas seulement via une méthode", async () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar], [grafcet]);
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(set, get, stubNotifier());
			const transitionId = "g1-trans-0";

			manager.setSimulationMode();
			await jest.advanceTimersByTimeAsync(60);

			expect(get().evaluableExpressionsValues[transitionId]).toBeDefined();
			manager.setDesignMode();
		});

		it("réinitialise les valeurs à l'arrêt de la simulation", async () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar], [grafcet]);
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(set, get, stubNotifier());

			manager.setSimulationMode();
			await jest.advanceTimersByTimeAsync(60);
			manager.setDesignMode();

			expect(get().evaluableExpressionsValues).toEqual({});
		});
	});

	describe("setSimulationMode() — appels répétés", () => {
		it("n'abandonne pas l'ancien PLC en marche quand appelée deux fois de suite", async () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar], [grafcet]);
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(set, get, stubNotifier());

			manager.setSimulationMode();
			manager.setSimulationMode();
			manager.setDesignMode();
			await jest.advanceTimersByTimeAsync(60);

			//Si le premier PLC n'avait pas été arrêté, son intervalle continuerait d'écrire dans
			//le store après le retour en conception.
			expect(get().simulationVariablesStates).toEqual({});
			expect(get().evaluableExpressionsValues).toEqual({});
		});
	});

	describe("analyze()", () => {
		function projectWithOneErrorAndOneWarning() {
			// Erreur : variable non déclarée dans la condition de la transition.
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "UNDEFINED_VAR", "VRAI");
			// Avertissement : une action sans expression n'a aucun effet.
			const action = new ActionBuilder()
				.id("a-empty")
				.type(ActionType.BOOLEAN_VARIABLE)
				.executionMode(ActionExecutionMode.SET)
				.expression("")
				.build();
			grafcet.actions.push(action);
			grafcet.connections.push(
				new ConnectionBuilder()
					.id("a-empty-conn")
					.source("step", "g1-step-0", "source:action")
					.target("action", "a-empty", "target:step")
					.build(),
			);
			return ProjectFactory.createWithGrafcets([grafcet]);
		}

		it("remplit analysisHasErrors/Warnings, les buckets, ouvre le panneau et notifie les comptes", () => {
			const project = projectWithOneErrorAndOneWarning();
			const notifier = stubNotifier();
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(set, get, notifier);

			manager.analyze();

			expect(get().analysisHasErrors).toBe(true);
			expect(get().analysisHasWarnings).toBe(true);
			expect(get().analysisErrors.grafcets["g1"]).toBeDefined();
			expect(get().analysisWarnings.grafcets["g1"]).toBeDefined();
			expect(get().ui.analysisResultVisible).toBe(true);
			expect(notifier.analysisCompleted).toHaveBeenCalledWith(
				expect.objectContaining({ errors: 1, warnings: 1 }),
			);
		});

		it("ne rouvre pas le panneau quand le projet n'a aucune issue", () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar], [grafcet]);
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(set, get, stubNotifier());

			manager.analyze();

			expect(get().analysisHasErrors).toBe(false);
			expect(get().analysisHasWarnings).toBe(false);
			expect(get().ui.analysisResultVisible).toBe(false);
		});
	});

	describe("setSimulationMode() — refus de démarrer", () => {
		it("reste en DESIGN et n'appelle jamais simulationStarting quand l'analyse a des erreurs", () => {
			const grafcet = new GrafcetBuilder().id("g1").build(); // grafcet vide : GRAFCET_TOO_FEW_STEPS
			const project = ProjectFactory.createWithGrafcets([grafcet]);
			const notifier = stubNotifier();
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(set, get, notifier);

			manager.setSimulationMode();

			expect(get().mode).toBe(ProjectMode.DESIGN);
			expect(notifier.simulationStarting).not.toHaveBeenCalled();
		});
	});

	describe("setSimulationMode() — affichage du panneau d'analyse", () => {
		function projectWithOneWarningOnly() {
			// Avertissement seul (pas d'erreur) : une action sans expression n'a aucun effet.
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "VRAI", "VRAI");
			const action = new ActionBuilder()
				.id("a-empty")
				.type(ActionType.BOOLEAN_VARIABLE)
				.executionMode(ActionExecutionMode.SET)
				.expression("")
				.build();
			grafcet.actions.push(action);
			grafcet.connections.push(
				new ConnectionBuilder()
					.id("a-empty-conn")
					.source("step", "g1-step-0", "source:action")
					.target("action", "a-empty", "target:step")
					.build(),
			);
			return ProjectFactory.createWithGrafcets([grafcet]);
		}

		it("ne rouvre pas le panneau à l'entrée en simulation quand le projet n'a que des avertissements", () => {
			const project = projectWithOneWarningOnly();
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(set, get, stubNotifier());

			manager.setSimulationMode();

			expect(get().mode).toBe(ProjectMode.SIMULATION);
			expect(get().analysisHasWarnings).toBe(true);
			expect(get().ui.analysisResultVisible).toBe(false);
		});

		it("ouvre quand même le panneau à l'entrée en simulation si le projet a des erreurs", () => {
			const grafcet = new GrafcetBuilder().id("g1").build(); // grafcet vide : GRAFCET_TOO_FEW_STEPS
			const project = ProjectFactory.createWithGrafcets([grafcet]);
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(set, get, stubNotifier());

			manager.setSimulationMode();

			expect(get().mode).toBe(ProjectMode.DESIGN);
			expect(get().ui.analysisResultVisible).toBe(true);
		});
	});

	describe("setPhysicalInputValue / setMemoryValue — gardes hors simulation", () => {
		it("lèvent hors mode simulation", () => {
			const project = ProjectFactory.createEmpty();
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(set, get, stubNotifier());

			expect(() => manager.setPhysicalInputValue("v1", true)).toThrow();
			expect(() => manager.setMemoryValue("v1", 1)).toThrow();
		});

		it("lèvent en mode simulation si le PLC n'est pas initialisé", () => {
			const project = ProjectFactory.createEmpty();
			const { get, set } = makeStore(project);
			set(() => ({ mode: ProjectMode.SIMULATION }));
			const manager = new SimulationManager(set, get, stubNotifier());

			expect(() => manager.setPhysicalInputValue("v1", true)).toThrow();
			expect(() => manager.setMemoryValue("v1", 1)).toThrow();
		});
	});

	describe("forceVariable / releaseVariable", () => {
		it("forceVariable met à jour forcedVariables dans le store", async () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar], [grafcet]);
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(set, get, stubNotifier());

			manager.setSimulationMode();
			await jest.advanceTimersByTimeAsync(20);

			const variableId = Object.keys(get().simulationVariablesStates).find(
				(id) => get().simulationVariablesStates[id].mnemonic === "I0",
			)!;
			manager.forceVariable(variableId, true);

			expect(get().forcedVariables[variableId]).toBe(true);
			manager.setDesignMode();
		});

		it("releaseVariable retire la variable de forcedVariables dans le store", async () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar], [grafcet]);
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(set, get, stubNotifier());

			manager.setSimulationMode();
			await jest.advanceTimersByTimeAsync(20);

			const variableId = Object.keys(get().simulationVariablesStates).find(
				(id) => get().simulationVariablesStates[id].mnemonic === "I0",
			)!;
			manager.forceVariable(variableId, true);
			manager.releaseVariable(variableId);

			expect(get().forcedVariables[variableId]).toBeUndefined();
			manager.setDesignMode();
		});

		it("stopSimulation vide forcedVariables", async () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar], [grafcet]);
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(set, get, stubNotifier());

			manager.setSimulationMode();
			await jest.advanceTimersByTimeAsync(20);

			const variableId = Object.keys(get().simulationVariablesStates).find(
				(id) => get().simulationVariablesStates[id].mnemonic === "I0",
			)!;
			manager.forceVariable(variableId, true);
			manager.setDesignMode();

			expect(get().forcedVariables).toEqual({});
		});
	});

	describe("onCycleError", () => {
		it("notifie simulationCrashed et repasse en DESIGN avec les états de variables vidés", async () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar], [grafcet]);
			const notifier = stubNotifier();
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(set, get, notifier);

			manager.setSimulationMode();
			await jest.advanceTimersByTimeAsync(20);
			// Simule un crash de cycle en appelant directement le callback enregistré sur le PLC.
			(manager as any).plc.onCycleError(new Error("boom"));

			expect(notifier.simulationCrashed).toHaveBeenCalled();
			expect(get().mode).toBe(ProjectMode.DESIGN);
			expect(get().simulationVariablesStates).toEqual({});
		});
	});
});
