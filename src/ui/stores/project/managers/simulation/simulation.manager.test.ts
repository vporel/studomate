import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import { wait } from "@tests/utils/test-helpers";
import { VariableFactory } from "@tests/utils/variable-factory";
import { ProjectStoreState } from "../../project.store";
import { ProjectMode } from "../../ProjectMode.enum";
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
		watchTablesVisible: false,
		simulationVariablesStates: {},
		evaluableExpressionsValues: {},
		analysisHasErrors: false,
		analysisHasWarnings: false,
		analysisErrors: { project: [], grafcets: {} },
		analysisWarnings: { project: [], grafcets: {} },
		analysisResultVisible: false,
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
		VariableFactory.reset();
		ProjectFactory.reset();
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
			await wait(60);

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
			await wait(60);
			manager.setDesignMode();

			expect(get().evaluableExpressionsValues).toEqual({});
		});
	});
});
