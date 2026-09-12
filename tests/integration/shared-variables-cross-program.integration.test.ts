import { ActionExecutionMode } from "@/schemas/grafcet/action.schema";
import { Dialect } from "@/expression-language/dialect.enum";
import Connection from "@/schemas/ladder/connection.schema";
import { createCoilElement, createContactElement, createRailTerminalElement } from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Project from "@/schemas/project/project.schema";
import Section from "@/schemas/ladder/section.schema";
import { createRandomId } from "@/ids";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { compilePipelineDetailed, compileToPLC, expectVariableValue } from "@tests/utils/test-helpers";
import { wireLadderIntoMain } from "@tests/utils/ladder-factory";
import { VariableFactory } from "@tests/utils/variable-factory";

/**
 * Le différenciateur annoncé du produit : des variables partagées entre GRAFCET et Ladder,
 * pilotées dans la **même** boucle PLC. `multi-grafcet` couvre grafcet↔grafcet et
 * `cross-reference` les liens statiques ; ici on fait tourner un projet où une section Ladder et
 * un grafcet s'échangent une variable, dans les deux ordres d'insertion des programmes.
 *
 * Les grafcets sont toujours scannés avant le Main (voir `ProjectCompiler`) — d'où une latence
 * d'un cycle quand le Ladder écrit ce que le grafcet lit ; les assertions portent sur l'état
 * stabilisé après plusieurs cycles.
 */
describe("Variables partagées entre programmes de types différents en simulation", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		VariableFactory.reset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	/** Section « borne ─ contact ─ bobine » câblée en série. */
	function wireContactToCoil(ladder: Ladder, section: Section, contact: ReturnType<typeof createContactElement>, coil: ReturnType<typeof createCoilElement>) {
		const rail = createRailTerminalElement(0);
		ladder.addElements(section.id, [rail, contact, coil]);
		ladder.addConnections(section.id, [
			new Connection(createRandomId(), { id: rail.id, type: "contact", handle: "source" }, { id: contact.id, type: "coil", handle: "target" }),
			new Connection(createRandomId(), { id: contact.id, type: "contact", handle: "source" }, { id: coil.id, type: "coil", handle: "target" }),
		]);
	}

	/**
	 * Projet identique quel que soit `ladderFirst` : seul l'ordre d'ajout des programmes change.
	 * - grafcet A lit `M` (écrite par le Ladder) : E0 ─[M]→ E1 (SET Q0) ─[NON M]→ E0
	 * - grafcet B écrit `M2` (lue par le Ladder) : E0 ─[VRAI]→ E1 (SET M2)
	 * - Ladder : section 1 `I0`→bobine `M`, section 2 `M2`→bobine `Q1`
	 */
	function buildProject(ladderFirst: boolean): Project {
		const project = new Project("shared", "Shared", "");
		project.variables = [
			VariableFactory.createLogicInput("I0"),
			VariableFactory.createMemoryBool("M"),
			VariableFactory.createMemoryBool("M2"),
			VariableFactory.createLogicOutput("Q0"),
			VariableFactory.createLogicOutput("Q1"),
		];

		const grafcetA = GrafcetFactory.createCycleWithBooleanActions(
			"gA", "Q0", "", "M", "NON M", ActionExecutionMode.SET,
		);
		const grafcetB = GrafcetFactory.createCycleWithBooleanActions(
			"gB", "M2", "", "VRAI", "FAUX", ActionExecutionMode.SET, ActionExecutionMode.SET, 10,
		);

		const makeLadder = () => {
			const ladder = project.createLadder("Partie opérative");
			wireLadderIntoMain(project, ladder);
			const sectionM = ladder.sections[0];
			wireContactToCoil(ladder, sectionM, createContactElement("I0", "NO", 0, 0), createCoilElement("M", "normal", 0, 1));
			const sectionQ1 = ladder.createSection("Report M2");
			wireContactToCoil(ladder, sectionQ1, createContactElement("M2", "NO", 0, 0), createCoilElement("Q1", "normal", 0, 1));
		};
		const addGrafcets = () => {
			project.addProgram(grafcetA);
			project.addProgram(grafcetB);
		};

		if (ladderFirst) {
			makeLadder();
			addGrafcets();
		} else {
			addGrafcets();
			makeLadder();
		}
		return project;
	}

	describe.each([
		["ladder ajouté en premier", true],
		["grafcets ajoutés en premier", false],
	])("ordre d'insertion : %s", (_label, ladderFirst) => {
		it("une section Ladder écrit une variable qu'une réceptivité GRAFCET lit", async () => {
			const project = buildProject(ladderFirst);
			const pipeline = compilePipelineDetailed(project);
			expect(pipeline.analysis.issues.filter((i) => i.severity === "error")).toEqual([]);

			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, Dialect.FR, { onCycleError: (e) => (cycleError = e) })!;
			expect(plc).not.toBeNull();

			plc.setPhysicalInputValueByName("I0", false);
			plc.start();
			await jest.advanceTimersByTimeAsync(100);
			if (cycleError) throw cycleError;
			// I0 faux : le Ladder maintient M faux, grafcet A reste en X0.
			expectVariableValue(plc, "M", false);
			expectVariableValue(plc, "X0", true);

			plc.setPhysicalInputValueByName("I0", true);
			await jest.advanceTimersByTimeAsync(100);
			if (cycleError) throw cycleError;
			// Le Ladder a posé M ; grafcet A l'a lu et a franchi E0 → E1 (SET Q0).
			expectVariableValue(plc, "M", true);
			expectVariableValue(plc, "X1", true);
			expectVariableValue(plc, "Q0", true);

			plc.setPhysicalInputValueByName("I0", false);
			await jest.advanceTimersByTimeAsync(100);
			plc.stop();
			if (cycleError) throw cycleError;
			// M retombe, grafcet A revient en X0.
			expectVariableValue(plc, "M", false);
			expectVariableValue(plc, "X0", true);
		});

		it("une action GRAFCET écrit une variable qu'une section Ladder lit", async () => {
			const project = buildProject(ladderFirst);

			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, Dialect.FR, { onCycleError: (e) => (cycleError = e) })!;
			expect(plc).not.toBeNull();

			plc.start();
			await jest.advanceTimersByTimeAsync(100);
			plc.stop();
			if (cycleError) throw cycleError;
			// grafcet B a posé M2 dès son premier franchissement ; la section Ladder l'a répercuté sur Q1.
			expectVariableValue(plc, "M2", true);
			expectVariableValue(plc, "Q1", true);
		});
	});

	it("scanne les grafcets avant le Main, indépendamment de l'ordre d'insertion", () => {
		// Séquence des routines scannées, chaque programme réduit à une étiquette stable
		// (l'id du Main est aléatoire d'un projet à l'autre). `null` = routine synthétique
		// (mémos d'étape, amorçage, observation).
		const scannedLabels = (ladderFirst: boolean): (string | null)[] => {
			const project = buildProject(ladderFirst);
			const compiled = compilePipelineDetailed(project).compilation.result!;
			const labelById = new Map<string, string>([
				["gA", "gA"],
				["gB", "gB"],
				[project.main.id, "MAIN"],
			]);
			const byRoutine = new Map(
				Object.entries(compiled.routinesById).map(([id, routine]) => [routine, id]),
			);
			return compiled.routines.map((routine) => {
				const id = byRoutine.get(routine);
				return id ? labelById.get(id) ?? null : null;
			});
		};

		const ladderFirstSeq = scannedLabels(true);
		expect(ladderFirstSeq).toEqual(scannedLabels(false));

		const grafcetAIndex = ladderFirstSeq.indexOf("gA");
		const mainIndex = ladderFirstSeq.indexOf("MAIN");
		expect(grafcetAIndex).toBeGreaterThanOrEqual(0);
		expect(mainIndex).toBeGreaterThanOrEqual(0);
		expect(grafcetAIndex).toBeLessThan(mainIndex);
	});
});
