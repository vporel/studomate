import { ActionExecutionMode } from "@/schemas/grafcet/action.schema";
import { Dialect } from "@/expression-language/dialect.enum";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import { compileToPLC, expectVariableValue, getVariableValue } from "@tests/utils/test-helpers";
import { VariableFactory } from "@tests/utils/variable-factory";
import PLC from "@/simulator/core/plc/plc";

/**
 * Comportement décrit au manuel utilisateur : les temporisations suivent le **temps réel**
 * écoulé — y compris entre deux « Avancer d'un cycle » en pas-à-pas — et ne sont figées qu'en
 * **pause du mode continu**. Verrouillé ici au niveau intégration (moteur d'horloge +
 * pipeline complet), une régression y passerait sinon inaperçue.
 */
describe("Simulation — timing pause / reprise / pas-à-pas", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		VariableFactory.reset();
		ProjectFactory.reset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	/** E0 (initiale) ─[t0/X0/600ms]→ E1 ─[hold]→ E0. `hold` reste faux : une fois E1 atteinte,
	 * `X1` y demeure — pratique pour observer le franchissement temporisé. Scan de 100 ms. */
	function buildPlc(): PLC {
		const grafcet = GrafcetFactory.createSimpleCycle(
			"g",
			"t0/X0/600ms",
			"hold",
		);
		const project = ProjectFactory.create(
			[VariableFactory.createLogicInput("hold")],
			[grafcet],
		);
		const plc = compileToPLC(project, 100, Dialect.FR);
		if (!plc) throw new Error("compilation échouée");
		return plc;
	}

	/** Cycle d'établissement (voir `SimulationManager.setSimulationMode`) : `deltaTimeMs` vaut 0,
	 * aucune tempo n'avance, mais l'étape initiale devient active. Le PLC reste en pause. */
	function establish(plc: PLC) {
		plc.start();
		plc.pause();
		plc.stepOnce();
	}

	it("cycle d'établissement : l'étape initiale s'active, aucune tempo n'avance, le PLC reste en pause", async () => {
		const plc = buildPlc();
		establish(plc);

		// L'étape initiale est active, la suivante non.
		expectVariableValue(plc, "X0", true);
		expectVariableValue(plc, "X1", false);

		// Le PLC reste en pause : laisser filer le temps ne fait tourner aucun cycle.
		await jest.advanceTimersByTimeAsync(5000);
		expectVariableValue(plc, "X0", true);
		expectVariableValue(plc, "X1", false);

		// Un « Avancer » juste après l'établissement (quasi aucun temps réel écoulé) : la tempo de
		// 600 ms n'a pas pu être imputée d'un coup, l'étape ne franchit pas.
		plc.stepOnce();
		expectVariableValue(plc, "X1", false);

		plc.stop();
	});

	it("rémanence : un redémarrage du même PLC ne réinitialise pas l'état", async () => {
		const grafcet = GrafcetFactory.createCycleWithBooleanActions(
			"g",
			"M", // action SET M sur E0
			"",
			"VRAI", // E0 → E1
			"hold", // E1 y reste (hold faux)
			ActionExecutionMode.SET,
		);
		const project = ProjectFactory.create(
			[VariableFactory.createLogicInput("hold"), VariableFactory.createMemoryBool("M")],
			[grafcet],
		);
		const plc = compileToPLC(project, 50, Dialect.FR);
		if (!plc) throw new Error("compilation échouée");

		plc.start();
		await jest.advanceTimersByTimeAsync(300);
		expectVariableValue(plc, "X1", true);
		expectVariableValue(plc, "M", true);
		plc.stop();

		// Redémarrage de la même instance : l'état (mémoire + étapes) est conservé.
		plc.start();
		expectVariableValue(plc, "M", true);
		expectVariableValue(plc, "X1", true);

		await jest.advanceTimersByTimeAsync(100);
		expect(getVariableValue(plc, "M")).toBe(true);
		plc.stop();
	});

	it("mode continu : la tempo échoit après ~600 ms de temps réel", async () => {
		const plc = buildPlc();
		establish(plc);
		plc.resume();

		expectVariableValue(plc, "X0", true);
		expectVariableValue(plc, "X1", false);

		await jest.advanceTimersByTimeAsync(400);
		expectVariableValue(plc, "X1", false);

		await jest.advanceTimersByTimeAsync(500);
		expectVariableValue(plc, "X1", true);

		plc.stop();
	});

	it("pause du mode continu : le temps passé en pause n'est pas imputé à la tempo", async () => {
		const plc = buildPlc();
		establish(plc);
		plc.resume();

		await jest.advanceTimersByTimeAsync(300);
		expectVariableValue(plc, "X1", false);

		// Horloge libre : les battements continuent d'être comptés, aucun cycle ne tourne.
		plc.pause();
		await jest.advanceTimersByTimeAsync(5000);
		plc.resume();

		// Si les 5 s de pause étaient imputées, le cycle suivant verrait un `deltaTimeMs` énorme
		// et la tempo franchirait immédiatement. Elle ne doit pas : ~300 ms seulement ont compté.
		await jest.advanceTimersByTimeAsync(100);
		expectVariableValue(plc, "X1", false);

		// La reprise repart d'où la tempo s'était figée : ~800 ms cumulés → franchissement.
		await jest.advanceTimersByTimeAsync(500);
		expectVariableValue(plc, "X1", true);

		plc.stop();
	});

	it("pas-à-pas : le temps réel écoulé entre deux 'Avancer' est imputé à la tempo", async () => {
		const plc = buildPlc();
		establish(plc); // reste en pause

		expectVariableValue(plc, "X0", true);
		expectVariableValue(plc, "X1", false);

		const step = async (elapsedMs: number) => {
			await jest.advanceTimersByTimeAsync(elapsedMs);
			plc.stepOnce();
		};

		// Amorçage de la tempo (front sur l'étape) — quelques cycles quasi sans temps.
		await step(50);
		await step(50);
		await step(50);
		expectVariableValue(plc, "X1", false);

		// Trois « Avancer » précédés de 400 ms réels chacun : ~1200 ms imputés en 3 cycles →
		// franchissement. Si `deltaTimeMs` était plafonné au temps de scan (100 ms), 3 cycles ne
		// suffiraient jamais pour une tempo de 600 ms partant d'un amorçage.
		await step(400);
		await step(400);
		await step(400);
		expectVariableValue(plc, "X1", true);

		plc.stop();
	});
});
