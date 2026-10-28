import { Dialect } from "@/expression-language/dialect.enum";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import {
	ActionExecutionMode,
	ActionType,
} from "@/schemas/grafcet/action.schema";
import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import { VariableFactory } from "@tests/utils/variable-factory";
import { ProjectStoreState } from "@/ui/stores/project/project.store";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { SimulationMode } from "@/ui/stores/project/SimulationMode.enum";
import { DivisionByZeroException } from "@/expression-language/interpreter/exceptions/division-by-zero.exception";
import { getAutoOpenHmiSimulationOnStart } from "@/persistence/preferences.storage";
import { isSystemVariableName } from "@/schemas/variable/system-variables";
import { PROJECT_TEMPLATES } from "@/templates";
import { compileProject } from "@tests/utils/test-helpers";
import { stubLocalStorage } from "@tests/utils/local-storage-stub";
import createAppProjectStoreEnvironment, {
	getPersistedSimulationMode,
} from "@/ui/stores/project/environment/app-project-store-environment";
import SimulationManager from "./simulation.manager";
import SimulationNotifier from "./simulation.notifier";

const mockTrackEvent = jest.fn();
jest.mock("@/ui/services/analytics", () => ({
	__esModule: true,
	default: (...args: unknown[]) => mockTrackEvent(...args),
}));
jest.mock("@/persistence/preferences.storage", () => ({
	...jest.requireActual("@/persistence/preferences.storage"),
	getAutoOpenHmiSimulationOnStart: jest.fn(() => true),
}));

const plcOf = (manager: SimulationManager) =>
	(manager as unknown as { plc: { onCycleError(error: unknown): void } }).plc;

const simulationEnv = (notifier: SimulationNotifier) =>
	createAppProjectStoreEnvironment({ simulationNotifier: notifier });

/** A grafcet the analyser rejects: a single step. */
function grafcetWithOneStep() {
	return new GrafcetBuilder()
		.id("g1")
		.addStep(
			new StepBuilder().id("s1").number(0).initial().position(0, 0).build(),
		)
		.build();
}

function stubNotifier(): SimulationNotifier {
	return {
		analysisCompleted: jest.fn(),
		simulationStarting: jest.fn(),
		simulationCouldNotStart: jest.fn(),
		simulationCrashed: jest.fn(),
		scene3dOpenBlocked: jest.fn(),
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
		simulationKind: "virtual",
		simulationVariablesStates: {},
		simulationVariablesStatesByMnemonic: {},
		observableExpressionsValues: {},
		forcedVariables: {},
		analysisHasErrors: false,
		analysisHasWarnings: false,
		analysisErrors: { project: [], grafcets: {} },
		analysisWarnings: { project: [], grafcets: {} },
		hmiManager: {
			openHmiSimulationPageIfAny: jest.fn(),
			closeHmiSimulationPage: jest.fn(),
		},
		scene3dLinkManager: { open: jest.fn(() => true) },
		hardwareLink: { status: "disconnected", drivenInputIds: [] },
		hardwareLinkManager: {
			onSimulationStart: jest.fn(),
			onCycleEnd: jest.fn(),
			fallback: jest.fn(),
			onSimulationStop: jest.fn(),
			onModeSettled: jest.fn(),
			writeBoardVariable: jest.fn(),
			forceBoardVariable: jest.fn(),
			releaseBoardVariable: jest.fn(),
		},
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
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);
			const transitionId = "g1-trans-0";

			manager.setSimulationMode();
			await jest.advanceTimersByTimeAsync(60);

			expect(get().observableExpressionsValues[transitionId]).toBeDefined();

			//Only I0, X0 and X1: the variables the compilation generates (step memos, fired
			//transitions, observations) are not simulation variables. System variables are
			//published separately.
			expect(
				Object.keys(get().simulationVariablesStates).filter(
					(id) => !isSystemVariableName(id),
				).length,
			).toBeLessThanOrEqual(3);

			manager.setDesignMode();
		});

		it("publie le temps écoulé d'une tempo nommée, à côté de l'état booléen de la transition", async () => {
			const grafcet = GrafcetFactory.createSimpleCycle(
				"g1",
				"VRAI",
				"T1/X1/2s",
			);
			const project = ProjectFactory.create([], [grafcet]);
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);
			const transitionId = "g1-trans-1";

			manager.setSimulationMode();
			await jest.advanceTimersByTimeAsync(60);

			const values = get().observableExpressionsValues[transitionId];
			const booleanEntry = values.find((v) => v.label === null);
			const timerEntry = values.find((v) => v.label === "T1");

			expect(booleanEntry?.value).toBe(false); //la tempo (2s) n'est pas encore écoulée
			expect(typeof timerEntry?.value).toBe("number");
			expect(timerEntry?.value as number).toBeGreaterThan(0);

			manager.setDesignMode();
		});

		it("réinitialise les valeurs à l'arrêt de la simulation", async () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar], [grafcet]);
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			manager.setSimulationMode();
			await jest.advanceTimersByTimeAsync(60);
			manager.setDesignMode();

			expect(get().observableExpressionsValues).toEqual({});
		});
	});

	describe("setSimulationMode() — situation initiale publiée à l'entrée", () => {
		function stepState(get: () => ProjectStoreState, mnemonic: string) {
			return Object.values(get().simulationVariablesStates).find(
				(v) => v.mnemonic === mnemonic,
			);
		}

		it("publie l'étape initiale active en pas-à-pas sans avancer l'horloge", () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar], [grafcet]);
			const { get, set } = makeStore(project);
			set({ simulationMode: SimulationMode.STEP_BY_STEP });
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			manager.setSimulationMode();

			// Aucun jest.advanceTimersByTime : seul le cycle d'établissement synchrone a tourné
			expect(stepState(get, "X0")?.value).toBe(true);
			expect(get().simulationPaused).toBe(true);

			manager.setDesignMode();
		});

		it("publie la situation initiale en continu avant tout battement d'horloge", () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar], [grafcet]);
			const { get, set } = makeStore(project);
			set({ simulationMode: SimulationMode.CONTINUOUS });
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			manager.setSimulationMode();

			expect(stepState(get, "X0")?.value).toBe(true);
			expect(get().simulationPaused).toBe(false);

			manager.setDesignMode();
		});
	});

	describe("setSimulationMode() — appels répétés", () => {
		it("n'abandonne pas l'ancien PLC en marche quand appelée deux fois de suite", async () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar], [grafcet]);
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			manager.setSimulationMode();
			manager.setSimulationMode();
			manager.setDesignMode();
			await jest.advanceTimersByTimeAsync(60);

			//Si le premier PLC n'avait pas été arrêté, son intervalle continuerait d'écrire dans
			//le store après le retour en conception.
			expect(get().simulationVariablesStates).toEqual({});
			expect(get().observableExpressionsValues).toEqual({});
		});
	});

	describe("setSimulationMode() — ouverture automatique de la simulation HMI", () => {
		afterEach(() => {
			(getAutoOpenHmiSimulationOnStart as jest.Mock).mockReturnValue(true);
		});

		it("ouvre la simulation HMI à l'entrée en simulation par défaut", () => {
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create(
				[VariableFactory.createLogicInput("I0")],
				[grafcet],
			);
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			manager.setSimulationMode();

			expect(get().hmiManager.openHmiSimulationPageIfAny).toHaveBeenCalled();

			manager.setDesignMode();
		});

		it("n'ouvre pas la simulation HMI quand la préférence est désactivée", () => {
			(getAutoOpenHmiSimulationOnStart as jest.Mock).mockReturnValue(false);
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create(
				[VariableFactory.createLogicInput("I0")],
				[grafcet],
			);
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			manager.setSimulationMode();

			expect(
				get().hmiManager.openHmiSimulationPageIfAny,
			).not.toHaveBeenCalled();

			manager.setDesignMode();
		});
	});

	describe("setSimulationMode() — vue ouverte à l'entrée en simulation", () => {
		afterEach(() => {
			(getAutoOpenHmiSimulationOnStart as jest.Mock).mockReturnValue(true);
		});

		function start(options: { hmiPage?: boolean; sceneId?: string } = {}) {
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create(
				[VariableFactory.createLogicInput("I0")],
				[grafcet],
			);
			if (options.sceneId) {
				project.scene3d = {
					sceneId: options.sceneId,
					sceneVersion: 1,
					bindings: {},
				};
			}
			const { get, set } = makeStore(project);
			(
				get().hmiManager.openHmiSimulationPageIfAny as jest.Mock
			).mockReturnValue(Boolean(options.hmiPage));
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);
			manager.setSimulationMode();
			const opened = {
				hmi: get().hmiManager.openHmiSimulationPageIfAny as jest.Mock,
				scene: get().scene3dLinkManager.open as jest.Mock,
			};
			manager.setDesignMode();
			return opened;
		}

		it("ouvre la page HMI, et pas la scène 3D, quand le projet a les deux", () => {
			const opened = start({
				hmiPage: true,
				sceneId: "carton-sorting",
			});
			expect(opened.hmi).toHaveBeenCalledTimes(1);
			expect(opened.scene).not.toHaveBeenCalled();
		});

		it("ouvre la scène 3D quand le projet n'a pas de page HMI", () => {
			const opened = start({ sceneId: "carton-sorting" });
			expect(opened.scene).toHaveBeenCalledTimes(1);
		});

		it("signale une ouverture bloquée par le navigateur, et permet de la retenter", () => {
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create(
				[VariableFactory.createLogicInput("I0")],
				[grafcet],
			);
			project.scene3d = {
				sceneId: "carton-sorting",
				sceneVersion: 1,
				bindings: {},
			};
			const { get, set } = makeStore(project);
			const open = get().scene3dLinkManager.open as jest.Mock;
			open.mockReturnValueOnce(false);
			const notifier = stubNotifier();
			const manager = new SimulationManager(set, get, simulationEnv(notifier));

			manager.setSimulationMode();
			manager.setDesignMode();

			expect(notifier.scene3dOpenBlocked).toHaveBeenCalledTimes(1);
			const retry = (notifier.scene3dOpenBlocked as jest.Mock).mock
				.calls[0][0] as () => void;
			retry();
			expect(open).toHaveBeenCalledTimes(2);
		});

		it("ne signale rien quand la scène s'est ouverte", () => {
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create(
				[VariableFactory.createLogicInput("I0")],
				[grafcet],
			);
			project.scene3d = {
				sceneId: "carton-sorting",
				sceneVersion: 1,
				bindings: {},
			};
			const { get, set } = makeStore(project);
			const notifier = stubNotifier();
			const manager = new SimulationManager(set, get, simulationEnv(notifier));

			manager.setSimulationMode();
			manager.setDesignMode();

			expect(notifier.scene3dOpenBlocked).not.toHaveBeenCalled();
		});

		it("n'ouvre rien sans page HMI ni scène 3D", () => {
			const opened = start();
			expect(opened.scene).not.toHaveBeenCalled();
		});

		it("n'ouvre pas une scène 3D inconnue de cette version", () => {
			const opened = start({
				sceneId: "scene-from-the-future",
			});
			expect(opened.scene).not.toHaveBeenCalled();
		});

		it("n'ouvre pas la scène 3D quand la préférence est désactivée", () => {
			(getAutoOpenHmiSimulationOnStart as jest.Mock).mockReturnValue(false);
			const opened = start({ sceneId: "carton-sorting" });
			expect(opened.scene).not.toHaveBeenCalled();
		});
	});

	describe("analyze()", () => {
		function projectWithOneErrorAndOneWarning() {
			// Erreur : variable non déclarée dans la condition de la transition.
			const grafcet = GrafcetFactory.createSimpleCycle(
				"g1",
				"UNDEFINED_VAR",
				"VRAI",
			);
			// Avertissement : une action sans expression n'a aucun effet.
			const action = new ActionBuilder()
				.id("a-empty")
				.type(ActionType.BOOLEAN_VARIABLE)
				.executionMode(ActionExecutionMode.SET)
				.expression("")
				.build();
			grafcet.actions[action.id] = action;
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
			const manager = new SimulationManager(set, get, simulationEnv(notifier));

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
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			manager.analyze();

			expect(get().analysisHasErrors).toBe(false);
			expect(get().analysisHasWarnings).toBe(false);
			expect(get().ui.analysisResultVisible).toBe(false);
		});
	});

	describe("analyse sans issue", () => {
		function cleanProject() {
			const inputVar = VariableFactory.createLogicInput("I0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			return ProjectFactory.create([inputVar], [grafcet]);
		}

		it("notifie la réussite quand l'utilisateur lance l'analyse", () => {
			const notifier = stubNotifier();
			const { get, set } = makeStore(cleanProject());
			new SimulationManager(set, get, simulationEnv(notifier)).analyze();

			expect(notifier.analysisCompleted).toHaveBeenCalledWith(
				expect.objectContaining({ errors: 0, warnings: 0 }),
			);
		});

		it("ne notifie pas la réussite de l'analyse lancée à l'entrée en simulation", () => {
			const notifier = stubNotifier();
			const { get, set } = makeStore(cleanProject());
			new SimulationManager(
				set,
				get,
				simulationEnv(notifier),
			).setSimulationMode();

			expect(notifier.analysisCompleted).not.toHaveBeenCalled();
		});
	});

	describe("setSimulationMode() — refus de démarrer", () => {
		it("reste en DESIGN et n'appelle jamais simulationStarting quand l'analyse a des erreurs", () => {
			const grafcet = grafcetWithOneStep(); // GRAFCET_TOO_FEW_STEPS
			const project = ProjectFactory.createWithGrafcets([grafcet]);
			const notifier = stubNotifier();
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(set, get, simulationEnv(notifier));

			const started = manager.setSimulationMode();

			expect(started).toBe(false);
			expect(get().mode).toBe(ProjectMode.DESIGN);
			expect(notifier.simulationStarting).not.toHaveBeenCalled();
		});
	});

	describe("setSimulationMode() — cycle d'établissement en erreur", () => {
		function managerWithFailingFirstCycle(mode: SimulationMode) {
			const inputVar = VariableFactory.createLogicInput("I0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar], [grafcet]);
			const notifier = stubNotifier();
			const { get, set } = makeStore(project);
			set({ simulationMode: mode });
			const manager = new SimulationManager(set, get, simulationEnv(notifier));
			const internals = manager as unknown as {
				createPLC(compiled: unknown): any;
			};
			const realCreatePLC = internals.createPLC.bind(manager);
			jest.spyOn(internals, "createPLC").mockImplementation((compiled) => {
				const plc = realCreatePLC(compiled);
				plc.stepOnce = () =>
					plc.onCycleError(
						new DivisionByZeroException(1, 0, {
							id: "n1",
							type: "NUMBER_LITERAL",
							value: 0,
						}),
					);
				return plc;
			});
			return { manager, get, notifier };
		}

		it("en continu : ne lève pas, renvoie false et reste en DESIGN", () => {
			const { manager, get, notifier } = managerWithFailingFirstCycle(
				SimulationMode.CONTINUOUS,
			);

			let started: boolean | undefined;
			expect(() => {
				started = manager.setSimulationMode();
			}).not.toThrow();

			expect(started).toBe(false);
			expect(get().mode).toBe(ProjectMode.DESIGN);
			expect(notifier.simulationCrashed).toHaveBeenCalledTimes(1);
			expect((manager as unknown as { plc: unknown }).plc).toBeNull();
		});

		it("en pas-à-pas : renvoie false, reste en DESIGN et non en pause", () => {
			mockTrackEvent.mockClear();
			const { manager, get } = managerWithFailingFirstCycle(
				SimulationMode.STEP_BY_STEP,
			);

			expect(manager.setSimulationMode()).toBe(false);

			expect(get().mode).toBe(ProjectMode.DESIGN);
			expect(get().simulationPaused).toBeFalsy();
			expect(mockTrackEvent).not.toHaveBeenCalledWith(
				"simulation-started",
				expect.anything(),
			);
		});

		it("un projet sain démarre toujours et renvoie true", () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar], [grafcet]);
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			expect(manager.setSimulationMode()).toBe(true);
			expect(get().mode).toBe(ProjectMode.SIMULATION);

			manager.setDesignMode();
		});
	});

	describe("types de simulation (virtuelle, E/S réelles, observation)", () => {
		const startable = () => {
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			return ProjectFactory.create(
				[VariableFactory.createLogicInput("I0")],
				[grafcet],
			);
		};

		it("démarre une simulation virtuelle par défaut, et le dit", () => {
			const { get, set } = makeStore(startable());
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			expect(manager.setSimulationMode()).toBe(true);

			expect(get().mode).toBe(ProjectMode.SIMULATION);
			expect(get().simulationKind).toBe("virtual");
			manager.setDesignMode();
		});

		it("retient le type « E/S réelles » avant d'avertir la liaison du démarrage", () => {
			const { get, set } = makeStore(startable());
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);
			let kindWhenStarting: unknown = null;
			(
				get().hardwareLinkManager.onSimulationStart as jest.Mock
			).mockImplementation(() => {
				kindWhenStarting = get().simulationKind;
			});

			expect(manager.setSimulationMode("hardware-io")).toBe(true);

			expect(kindWhenStarting).toBe("hardware-io");
			expect(get().simulationKind).toBe("hardware-io");
			manager.setDesignMode();
		});

		it("laisse le type inchangé quand la simulation ne démarre pas", () => {
			const grafcet = grafcetWithOneStep();
			const { get, set } = makeStore(
				ProjectFactory.createWithGrafcets([grafcet]),
			);
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			expect(manager.setSimulationMode("hardware-io")).toBe(false);

			expect(get().simulationKind).toBe("virtual");
		});

		it("change le type d'une simulation en cours sans la redémarrer", async () => {
			const { get, set } = makeStore(startable());
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);
			manager.setSimulationMode("hardware-io");

			manager.setSimulationKind("virtual");

			expect(get().simulationKind).toBe("virtual");
			expect(get().mode).toBe(ProjectMode.SIMULATION);
			manager.setDesignMode();
		});

		it("prévient la liaison quand un mode est en place, et avant d'arrêter une simulation", () => {
			const { get, set } = makeStore(startable());
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);
			const link = get().hardwareLinkManager as unknown as {
				onModeSettled: jest.Mock;
				onSimulationStop: jest.Mock;
			};

			manager.setSimulationMode();
			expect(link.onModeSettled).toHaveBeenCalledTimes(1);

			manager.setDesignMode();
			expect(link.onSimulationStop).toHaveBeenCalled();
			expect(link.onModeSettled).toHaveBeenCalledTimes(2);
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
			grafcet.actions[action.id] = action;
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
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			manager.setSimulationMode();

			expect(get().mode).toBe(ProjectMode.SIMULATION);
			expect(get().analysisHasWarnings).toBe(true);
			expect(get().ui.analysisResultVisible).toBe(false);
		});

		it("ouvre quand même le panneau à l'entrée en simulation si le projet a des erreurs", () => {
			const grafcet = grafcetWithOneStep(); // GRAFCET_TOO_FEW_STEPS
			const project = ProjectFactory.createWithGrafcets([grafcet]);
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			manager.setSimulationMode();

			expect(get().mode).toBe(ProjectMode.DESIGN);
			expect(get().ui.analysisResultVisible).toBe(true);
		});
	});

	describe("setPhysicalInputValue / setMemoryValue — gardes hors simulation", () => {
		it("lèvent hors mode simulation", () => {
			const project = ProjectFactory.createEmpty();
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			expect(() => manager.setPhysicalInputValue("v1", true)).toThrow();
			expect(() => manager.setMemoryValue("v1", 1)).toThrow();
		});

		it("lèvent en mode simulation si le PLC n'est pas initialisé", () => {
			const project = ProjectFactory.createEmpty();
			const { get, set } = makeStore(project);
			set(() => ({ mode: ProjectMode.SIMULATION }));
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			expect(() => manager.setPhysicalInputValue("v1", true)).toThrow();
			expect(() => manager.setMemoryValue("v1", 1)).toThrow();
		});
	});

	describe("setPhysicalInputValue / setMemoryValue — pas-à-pas en pause", () => {
		it("répercute immédiatement la valeur dans simulationVariablesStates sans attendre un cycle", async () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const memoryVar = VariableFactory.createMemoryBool("M0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar, memoryVar], [grafcet]);
			const { get, set } = makeStore(project);
			set(() => ({ simulationMode: SimulationMode.STEP_BY_STEP }));
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			manager.setSimulationMode();
			await jest.advanceTimersByTimeAsync(0);
			expect(get().simulationPaused).toBe(true);

			const i0Id = Object.keys(get().simulationVariablesStates).find(
				(id) => get().simulationVariablesStates[id].mnemonic === "I0",
			)!;
			const m0Id = Object.keys(get().simulationVariablesStates).find(
				(id) => get().simulationVariablesStates[id].mnemonic === "M0",
			)!;

			manager.setPhysicalInputValue(i0Id, true);
			expect(get().simulationVariablesStates[i0Id].value).toBe(true);

			manager.setMemoryValue(m0Id, true);
			expect(get().simulationVariablesStates[m0Id].value).toBe(true);

			manager.setDesignMode();
		});
	});

	describe("comportement physique des entrées", () => {
		it("démarre une entrée NF à VRAI et ramène l'écriture d'un curseur à sa borne", async () => {
			const arret = VariableFactory.createLogicInput("arret").update(
				{
					behavior: { kind: "push-button-nc", params: null },
				},
				Dialect.FR,
			);
			const niveau = VariableFactory.createAnalogInput("niveau").update(
				{
					behavior: { kind: "slider", params: { min: 0, max: 100 } },
				},
				Dialect.FR,
			);
			const grafcet = GrafcetFactory.createSimpleCycle(
				"g1",
				"arret",
				"NON arret",
			);
			const project = ProjectFactory.create([arret, niveau], [grafcet]);
			const { get, set } = makeStore(project);
			set(() => ({ simulationMode: SimulationMode.STEP_BY_STEP }));
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			manager.setSimulationMode();
			await jest.advanceTimersByTimeAsync(0);

			expect(get().simulationVariablesStates[arret.id].value).toBe(true);
			expect(get().simulationVariablesStates[niveau.id].value).toBe(0);

			manager.setPhysicalInputValue(niveau.id, 150);
			expect(get().simulationVariablesStates[niveau.id].value).toBe(100);

			manager.setPhysicalInputValue(niveau.id, -5);
			expect(get().simulationVariablesStates[niveau.id].value).toBe(0);

			manager.setDesignMode();
		});
	});

	describe("constantes", () => {
		it("ignore l'écriture et le forçage d'une constante", async () => {
			const seuil = VariableBuilder.buildConstant("k", "SEUIL", "INT", "40");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create(
				[seuil, VariableFactory.createLogicInput("I0")],
				[grafcet],
			);
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);
			manager.setSimulationMode();
			await jest.advanceTimersByTimeAsync(20);
			const id = Object.keys(get().simulationVariablesStates).find(
				(key) => get().simulationVariablesStates[key].mnemonic === "SEUIL",
			)!;

			expect(() => manager.setMemoryValue(id, 1)).not.toThrow();
			expect(() => manager.forceVariable(id, 1)).not.toThrow();
			await jest.advanceTimersByTimeAsync(300);

			expect(get().forcedVariables[id]).toBeUndefined();
			expect(get().simulationVariablesStates[id].value).toBe(40);
			manager.setDesignMode();
		});
	});

	describe("forceVariable / releaseVariable", () => {
		it("forceVariable met à jour forcedVariables dans le store", async () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar], [grafcet]);
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

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
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

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
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

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

	describe("forceVariable / setMemoryValue — coercition de type défensive", () => {
		it("force une valeur mal typée sur une variable BOOL sans crasher la simulation", async () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar], [grafcet]);
			const { get, set } = makeStore(project);
			const notifier = stubNotifier();
			const manager = new SimulationManager(set, get, simulationEnv(notifier));

			manager.setSimulationMode();
			await jest.advanceTimersByTimeAsync(20);
			const i0Id = Object.keys(get().simulationVariablesStates).find(
				(id) => get().simulationVariablesStates[id].mnemonic === "I0",
			)!;

			manager.forceVariable(i0Id, 1 as unknown as boolean);
			expect(get().forcedVariables[i0Id]).toBe(true); // coercé

			await jest.advanceTimersByTimeAsync(60);
			expect(notifier.simulationCrashed).not.toHaveBeenCalled();

			manager.setDesignMode();
		});

		it("ignore un nombre non fini passé à setMemoryValue", async () => {
			const n = VariableFactory.createMemoryInt("N");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "VRAI", "VRAI");
			const project = ProjectFactory.create([n], [grafcet]);
			const { get, set } = makeStore(project);
			const notifier = stubNotifier();
			const manager = new SimulationManager(set, get, simulationEnv(notifier));

			manager.setSimulationMode();
			await jest.advanceTimersByTimeAsync(20);
			const nId = get().project!.variables.find((v) => v.mnemonic === "N")!.id;

			expect(() => manager.setMemoryValue(nId, NaN)).not.toThrow();
			await jest.advanceTimersByTimeAsync(60);
			expect(notifier.simulationCrashed).not.toHaveBeenCalled();

			manager.setDesignMode();
		});

		it("no-op silencieux quand la variable est inconnue du PLC", () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar], [grafcet]);
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			manager.setSimulationMode();
			manager.forceVariable("id-inexistant", true);

			expect(get().forcedVariables["id-inexistant"]).toBeUndefined();
			manager.setDesignMode();
		});
	});

	describe("onCycleError", () => {
		it("notifie simulationCrashed et repasse en DESIGN avec les états de variables vidés", async () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar], [grafcet]);
			const notifier = stubNotifier();
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(set, get, simulationEnv(notifier));

			manager.setSimulationMode();
			await jest.advanceTimersByTimeAsync(20);
			// Simule un crash de cycle en appelant directement le callback enregistré sur le PLC.
			plcOf(manager).onCycleError(new Error("boom"));

			expect(notifier.simulationCrashed).toHaveBeenCalled();
			expect(get().mode).toBe(ProjectMode.DESIGN);
			expect(get().simulationVariablesStates).toEqual({});
		});

		it("remonte le message lisible de l'exception à l'origine du crash", async () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar], [grafcet]);
			const notifier = stubNotifier();
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(set, get, simulationEnv(notifier));

			manager.setSimulationMode();
			await jest.advanceTimersByTimeAsync(20);
			plcOf(manager).onCycleError(
				new DivisionByZeroException(10, 0, {
					id: "n1",
					type: "NUMBER_LITERAL",
					value: 0,
				}),
			);

			expect(notifier.simulationCrashed).toHaveBeenCalledWith(
				expect.stringContaining("10 / 0"),
			);
		});
	});

	describe("publishCycleState — publication différentielle", () => {
		/** Grafcet figé : les deux réceptivités sont fausses, aucune variable ne bouge après
		 *  l'activation de l'étape initiale. */
		function frozenProject() {
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "FAUX", "FAUX");
			return ProjectFactory.createWithGrafcets([grafcet]);
		}

		function recordingStore(project: ReturnType<typeof ProjectFactory.create>) {
			const base = makeStore(project);
			const patches: Array<Record<string, unknown>> = [];
			const set = (partial: any) => {
				const patch =
					typeof partial === "function" ? partial(base.get()) : partial;
				patches.push(patch);
				base.set(partial);
			};
			return { get: base.get, set, patches };
		}

		const varPatches = (patches: Array<Record<string, unknown>>) =>
			patches.filter((p) => "simulationVariablesStates" in p);
		// Les bases de temps système changent d'elles-mêmes : seules les variables du projet
		// doivent rester silencieuses quand rien ne bouge. Chaque patch porte l'état complet,
		// on compte donc les patches où la part « projet » diffère du patch précédent.
		const projectVarPatches = (patches: Array<Record<string, unknown>>) => {
			let previous = "";
			return varPatches(patches).filter((patch) => {
				const projectPart = JSON.stringify(
					Object.entries(patch.simulationVariablesStates as object).filter(
						([id]) => !isSystemVariableName(id),
					),
				);
				const changed = projectPart !== previous;
				previous = projectPart;
				return changed;
			});
		};

		it("ne republie simulationVariablesStates que lorsqu'une valeur change", async () => {
			const { get, set, patches } = recordingStore(frozenProject());
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			manager.setSimulationMode();
			await jest.advanceTimersByTimeAsync(40); // stabilisation
			const countAfterSettle = projectVarPatches(patches).length;
			expect(countAfterSettle).toBeGreaterThan(0);

			await jest.advanceTimersByTimeAsync(150); // ~15 cycles, état figé
			expect(projectVarPatches(patches).length).toBe(countAfterSettle);

			manager.setDesignMode();
		});

		it("republie l'état complet au redémarrage (référence de diff réinitialisée)", async () => {
			const { get, set, patches } = recordingStore(frozenProject());
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			manager.setSimulationMode();
			await jest.advanceTimersByTimeAsync(60);
			const allVarIds = Object.keys(get().simulationVariablesStates);
			expect(allVarIds.length).toBeGreaterThan(0);

			manager.setDesignMode();
			patches.length = 0;

			manager.setSimulationMode();
			await jest.advanceTimersByTimeAsync(40);

			const firstRepublish = varPatches(patches)[0]
				.simulationVariablesStates as Record<string, unknown>;
			// Toutes les variables sont republiées d'un coup, pas seulement un delta.
			expect(Object.keys(firstRepublish).sort()).toEqual(allVarIds.sort());

			manager.setDesignMode();
		});

		it("publie les variables système, pour que les contacts Ladder qui les lisent s'éclairent", async () => {
			const { get, set } = recordingStore(frozenProject());
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			manager.setSimulationMode();
			await jest.advanceTimersByTimeAsync(250);

			const byMnemonic = get().simulationVariablesStatesByMnemonic;
			expect(byMnemonic["_SYS_FIRST_SCAN"]).toBeDefined();
			expect(typeof byMnemonic["_SYS_TB_200ms"].value).toBe("boolean");
			const seen = new Set<unknown>();
			for (let i = 0; i < 6; i++) {
				seen.add(
					get().simulationVariablesStatesByMnemonic["_SYS_TB_200ms"].value,
				);
				await jest.advanceTimersByTimeAsync(100);
			}
			// Un signal carré : il prend les deux valeurs au fil des cycles.
			expect(seen).toEqual(new Set([true, false]));

			manager.setDesignMode();
		});

		it("publie une vue indexée par mnémonique en miroir de simulationVariablesStates", async () => {
			const { get, set } = recordingStore(frozenProject());
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			manager.setSimulationMode();
			await jest.advanceTimersByTimeAsync(60);

			const byId = get().simulationVariablesStates;
			const byMnemonic = get().simulationVariablesStatesByMnemonic;
			expect(Object.keys(byMnemonic).length).toBe(Object.keys(byId).length);
			for (const entry of Object.values(byId)) {
				expect(byMnemonic[entry.mnemonic]).toEqual(entry);
			}

			manager.setDesignMode();
			expect(get().simulationVariablesStatesByMnemonic).toEqual({});
		});
	});

	describe("suivi du programme d'une carte (mode en ligne)", () => {
		const trafficLight = () =>
			compileProject(
				PROJECT_TEMPLATES.find((t) => t.id === "traffic-light")!.solution!(
					"fr",
				),
			)!;

		it("passe en simulation sans PLC local, la source étant la carte", () => {
			const { get, set } = makeStore(ProjectFactory.create([], []));
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			manager.startOnline(trafficLight());

			expect(get().mode).toBe(ProjectMode.SIMULATION);
			expect(get().simulationKind).toBe("observation");
			expect(get().simulationPaused).toBe(false);
			expect(get().hmiManager.openHmiSimulationPageIfAny).toHaveBeenCalled();
		});

		it("publie les valeurs rapportées par la carte, et les valeurs observées qui en découlent", () => {
			const compiled = trafficLight();
			const { get, set } = makeStore(ProjectFactory.create([], []));
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);
			manager.startOnline(compiled);
			const stepName = compiled.variables
				.find((v) => /^X\d/.test(v.getName()))!
				.getName();

			manager.publishBoardSnapshot({ [stepName]: true });

			const state = get();
			expect(state.simulationVariablesStatesByMnemonic[stepName]?.value).toBe(
				true,
			);
			expect(
				Object.keys(state.observableExpressionsValues).length,
			).toBeGreaterThan(0);
		});

		it("ne publie pas les variables internes rapportées par la carte", () => {
			const compiled = trafficLight();
			const { get, set } = makeStore(ProjectFactory.create([], []));
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);
			manager.startOnline(compiled);
			const observedIds = new Set(
				Object.values(compiled.observableExpressionVariableIds).flatMap(
					(refs) => refs.map((ref) => ref.variableId),
				),
			);
			const internal = compiled.variables.filter(
				(v) => v.isInternal() && !observedIds.has(v.getId()),
			);
			expect(internal.length).toBeGreaterThan(0);

			manager.publishBoardSnapshot(
				Object.fromEntries(
					internal.map((v) => [
						v.getName(),
						v.getType() === "boolean" ? true : 1,
					]),
				),
			);

			for (const v of internal) {
				expect(get().simulationVariablesStates[v.getId()]).toBeUndefined();
			}
		});

		it("ne publie rien sans suivi de carte", () => {
			const { get, set } = makeStore(ProjectFactory.create([], []));
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);
			manager.publishBoardSnapshot({ X0: true });
			expect(get().simulationVariablesStatesByMnemonic).toEqual({});
		});

		describe("écritures de l'interface vers la carte", () => {
			const setupOnline = () => {
				const compiled = compileProject(
					PROJECT_TEMPLATES.find((t) => t.id === "elevator")!.solution!("fr"),
				)!;
				const store = makeStore(ProjectFactory.create([], []));
				const manager = new SimulationManager(
					store.set,
					store.get,
					simulationEnv(stubNotifier()),
				);
				manager.startOnline(compiled);
				const input = compiled.variables.find((v) => v.getScope() === "input")!;
				const memory = compiled.variables.find(
					(v) => v.getScope() === "memory" && !v.getName().startsWith("_"),
				)!;
				const link = store.get().hardwareLinkManager as unknown as {
					writeBoardVariable: jest.Mock;
					forceBoardVariable: jest.Mock;
					releaseBoardVariable: jest.Mock;
				};
				return { ...store, manager, input, memory, link };
			};

			it("transmet à la carte la saisie d'une entrée qui n'est pas câblée sur une broche", () => {
				const { manager, input, link } = setupOnline();
				manager.setPhysicalInputValue(input.getId(), true);
				expect(link.writeBoardVariable).toHaveBeenCalledWith(
					input.getName(),
					true,
				);
			});

			it("ne transmet pas la saisie d'une entrée pilotée par une broche", () => {
				const { manager, input, link, get, set } = setupOnline();
				set({
					hardwareLink: {
						...get().hardwareLink,
						drivenInputIds: [input.getId()],
					},
				});
				manager.setPhysicalInputValue(input.getId(), true);
				expect(link.writeBoardVariable).not.toHaveBeenCalled();
			});

			it("transmet l'écriture d'une mémoire, un nombre étant tronqué à l'entier", () => {
				const { manager, memory, link } = setupOnline();
				manager.setMemoryValue(memory.getId(), 3.9);
				expect(link.writeBoardVariable).toHaveBeenCalledWith(
					memory.getName(),
					3,
				);
			});

			it("ignore une valeur qui n'est pas un nombre, et une variable inconnue", () => {
				const { manager, memory, link } = setupOnline();
				manager.setMemoryValue(memory.getId(), "abc");
				manager.setMemoryValue("inconnue", 1);
				expect(link.writeBoardVariable).not.toHaveBeenCalled();
			});

			it("force et libère une variable sur la carte, et le retient dans le store", () => {
				const { manager, memory, link, get } = setupOnline();

				manager.forceVariable(memory.getId(), true);
				expect(link.forceBoardVariable).toHaveBeenCalledWith(
					memory.getName(),
					true,
				);
				expect(get().forcedVariables[memory.getId()]).toBe(true);

				manager.releaseVariable(memory.getId());
				expect(link.releaseBoardVariable).toHaveBeenCalledWith(
					memory.getName(),
				);
				expect(get().forcedVariables).toEqual({});
			});
		});

		it("revient à la conception : source locale, états vidés, suivi de la carte arrêté", () => {
			const compiled = trafficLight();
			const { get, set } = makeStore(ProjectFactory.create([], []));
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);
			manager.startOnline(compiled);
			manager.publishBoardSnapshot({ X0: true });

			manager.setDesignMode();

			expect(get().mode).toBe(ProjectMode.DESIGN);
			expect(get().simulationKind).toBe("virtual");
			expect(get().simulationVariablesStatesByMnemonic).toEqual({});
			expect(get().hardwareLinkManager.onSimulationStop).toHaveBeenCalled();
		});

		it("quitte d'abord une simulation locale en cours", async () => {
			const project = ProjectFactory.create(
				[VariableFactory.createLogicInput("I0")],
				[GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0")],
			);
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);
			manager.setSimulationMode();
			await jest.advanceTimersByTimeAsync(30);

			manager.startOnline(trafficLight());

			expect(get().simulationKind).toBe("observation");
			expect(get().simulationVariablesStates).toEqual({});
			manager.setDesignMode();
		});
	});

	describe("mode de simulation persisté", () => {
		let restoreLocalStorage: () => void = () => {};
		afterEach(() => restoreLocalStorage());

		it("relit le mode pas à pas depuis le stockage", () => {
			restoreLocalStorage = stubLocalStorage({
				getItem: () => SimulationMode.STEP_BY_STEP,
			});

			expect(getPersistedSimulationMode()).toBe(SimulationMode.STEP_BY_STEP);
		});

		it("retombe sur le mode continu quand le stockage est indisponible", () => {
			restoreLocalStorage = stubLocalStorage({
				getItem: () => {
					throw new Error("blocked");
				},
			});

			expect(getPersistedSimulationMode()).toBe(SimulationMode.CONTINUOUS);
		});

		it("applique le mode même si l'écriture dans le stockage échoue", () => {
			restoreLocalStorage = stubLocalStorage({
				setItem: () => {
					throw new Error("blocked");
				},
			});
			const { get, set } = makeStore(ProjectFactory.createEmpty());
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			expect(() =>
				manager.setPlcSimulationMode(SimulationMode.STEP_BY_STEP),
			).not.toThrow();
			expect(get().simulationMode).toBe(SimulationMode.STEP_BY_STEP);
		});
	});

	describe("liaison matérielle", () => {
		it("prévient le gestionnaire de liaison au démarrage, à chaque fin de cycle et à l'arrêt", async () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar], [grafcet]);
			const { get, set } = makeStore(project);
			const link = get().hardwareLinkManager as unknown as Record<
				string,
				jest.Mock
			>;
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			manager.setSimulationMode();
			expect(link.onSimulationStart).toHaveBeenCalledTimes(1);

			await jest.advanceTimersByTimeAsync(35);
			expect(link.onCycleEnd).toHaveBeenCalled();
			expect(link.fallback).not.toHaveBeenCalled();

			manager.setDesignMode();
			expect(link.fallback).toHaveBeenCalled();
		});

		it("ne met pas la carte en repli lors d'une pause", async () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar], [grafcet]);
			const { get, set } = makeStore(project);
			const link = get().hardwareLinkManager as unknown as Record<
				string,
				jest.Mock
			>;
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);
			manager.setSimulationMode();

			manager.pauseSimulation();

			expect(link.fallback).not.toHaveBeenCalled();
			manager.setDesignMode();
		});

		it("applyExternalInputs écrit les valeurs des broches dans le PLC et le store", () => {
			const inputVar = VariableFactory.createLogicInput("I0", "i0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar], [grafcet]);
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);
			manager.setSimulationMode();

			manager.applyExternalInputs(new Map([["i0", true]]));

			expect(get().simulationVariablesStates["i0"]?.value).toBe(true);
			manager.setDesignMode();
		});

		it("applyExternalInputs est sans effet hors simulation", () => {
			const project = ProjectFactory.create([], []);
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);

			expect(() =>
				manager.applyExternalInputs(new Map([["x", true]])),
			).not.toThrow();
			expect(get().simulationVariablesStates).toEqual({});
		});

		describe("scène 3D", () => {
			function startWithScene() {
				const inputVar = VariableFactory.createLogicInput("I0", "i0");
				const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
				const project = ProjectFactory.create([inputVar], [grafcet]);
				project.scene3d = {
					sceneId: "carton-sorting",
					sceneVersion: 1,
					bindings: { p1AtIn: "i0" },
				};
				const { get, set } = makeStore(project);
				const manager = new SimulationManager(
					set,
					get,
					simulationEnv(stubNotifier()),
				);
				manager.setSimulationMode();
				return { get, manager };
			}

			it("signale la scène 3D et l'absence de matériel dans simulation-started", () => {
				mockTrackEvent.mockClear();
				const { manager } = startWithScene();
				expect(mockTrackEvent).toHaveBeenCalledWith(
					"simulation-started",
					expect.objectContaining({ hardware: false, scene3d: true }),
				);
				manager.setDesignMode();
			});

			it("donne au PLC les capteurs initiaux de la scène dès l'entrée en simulation", () => {
				const { get, manager } = startWithScene();
				expect(get().simulationVariablesStates["i0"]?.value).toBe(true);
				manager.setDesignMode();
			});

			it("publie les entrées pilotées par la scène dans le store, vidées à l'arrêt", () => {
				const { get, manager } = startWithScene();
				expect(get().scene3dDrivenInputIds).toEqual(["i0"]);
				manager.setDesignMode();
				expect(get().scene3dDrivenInputIds).toEqual([]);
			});

			it("ignore une saisie de l'IHM sur une entrée pilotée par un capteur de la scène", () => {
				const { get, manager } = startWithScene();
				manager.setPhysicalInputValue("i0", false);
				expect(get().simulationVariablesStates["i0"]?.value).toBe(true);
				manager.setDesignMode();
			});

			it("publie l'état de la scène à chaque cycle puis le remet à zéro à l'arrêt", async () => {
				const { manager } = startWithScene();
				const times: number[] = [];
				manager.subscribeScene3d((snapshot) => times.push(snapshot.simTimeMs));
				await jest.advanceTimersByTimeAsync(35);
				expect(times.length).toBeGreaterThan(0);
				expect(Math.max(...times)).toBeGreaterThan(0);
				manager.setDesignMode();
				expect(times[times.length - 1]).toBe(0);
			});

			it("laisse une entrée sans scène modifiable par l'IHM", () => {
				const inputVar = VariableFactory.createLogicInput("I0", "i0");
				const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
				const project = ProjectFactory.create([inputVar], [grafcet]);
				const { get, set } = makeStore(project);
				const manager = new SimulationManager(
					set,
					get,
					simulationEnv(stubNotifier()),
				);
				manager.setSimulationMode();
				manager.setPhysicalInputValue("i0", true);
				expect(get().simulationVariablesStates["i0"]?.value).toBe(true);
				manager.setDesignMode();
			});
		});

		it("ignore une saisie de l'IHM sur une entrée pilotée par la carte", () => {
			const inputVar = VariableFactory.createLogicInput("I0", "i0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar], [grafcet]);
			const { get, set } = makeStore(project);
			const manager = new SimulationManager(
				set,
				get,
				simulationEnv(stubNotifier()),
			);
			manager.setSimulationMode();
			set({ hardwareLink: { status: "linked", drivenInputIds: ["i0"] } });

			manager.setPhysicalInputValue("i0", true);
			expect(get().simulationVariablesStates["i0"]?.value).not.toBe(true);

			set({ hardwareLink: { status: "disconnected", drivenInputIds: [] } });
			manager.setPhysicalInputValue("i0", true);
			expect(get().simulationVariablesStates["i0"]?.value).toBe(true);
			manager.setDesignMode();
		});
	});

	describe("signal d'avis", () => {
		function makeManager() {
			const inputVar = VariableFactory.createLogicInput("I0");
			const grafcet = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0");
			const project = ProjectFactory.create([inputVar], [grafcet]);
			const { get, set } = makeStore(project);
			const notify = jest.fn();
			const manager = new SimulationManager(
				set,
				get,
				createAppProjectStoreEnvironment({
					simulationNotifier: stubNotifier(),
					feedback: { notify },
				}),
			);
			return { manager, notify };
		}

		it("signale la fin d'une simulation quand on revient en conception", () => {
			const { manager, notify } = makeManager();
			manager.setSimulationMode();

			manager.setDesignMode();

			expect(notify).toHaveBeenCalledTimes(1);
			expect(notify).toHaveBeenCalledWith("simulation-ended");
		});

		it("ne signale rien quand aucune simulation n'était en cours", () => {
			const { manager, notify } = makeManager();

			manager.setDesignMode();

			expect(notify).not.toHaveBeenCalled();
		});
	});
});
