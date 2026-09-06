import { Dialect } from "@/expression-language/dialect.enum";
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import Project from "@/schemas/project/project.schema";
import { resolvePositionAnimationOffset } from "@/ui/components/hmi/view/hmi-position-animation";
import Connection from "@/schemas/ladder/connection.schema";
import { createCoilElement, createContactElement, createRailTerminalElement } from "@/schemas/ladder/element.schema";
import { createRandomId } from "@/ids";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import { compileToPLC, expectVariableValue, getVariableValue } from "@tests/utils/test-helpers";
import { wireLadderIntoMain } from "@tests/utils/ladder-factory";
import { VariableFactory } from "@tests/utils/variable-factory";

/**
 * Le seul chemin qu'aucun test d'intégration ne couvrait : **HMI dans la boucle** —
 * événement d'un widget → écriture d'une variable → franchissement grafcet → valeur d'animation
 * d'un autre widget. C'est le différenciateur annoncé du produit.
 *
 * Côté lecture, on appelle le vrai résolveur d'animation (`resolvePositionAnimationOffset`).
 * Côté écriture, on rejoue la résolution que fait `HmiCanvas.setVariableValue` (widget écrivain
 * → variable d'entrée par mnémonique → `plc.setPhysicalInputValueById`), non extraite en
 * fonction pure aujourd'hui.
 */
describe("HMI dans la boucle de simulation", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		VariableFactory.reset();
		ProjectFactory.reset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("bouton poussoir → entrée → grafcet → animation de position d'un autre widget", async () => {
		// Grafcet : E0 ─[dcy]→ E1 (action continue `pos := 40`) ─[NON dcy]→ E0.
		const grafcet = GrafcetFactory.createNumericActionCycle("g", "pos := 40");
		grafcet.transitions["g-trans-0"].data.expression = "dcy";
		grafcet.transitions["g-trans-1"].data.expression = "NON dcy";

		const project: Project = ProjectFactory.create(
			[
				VariableFactory.createLogicInput("dcy"),
				VariableFactory.createMemoryInt("pos"),
			],
			[grafcet],
		);

		const hmiPage = project.createHmiPage("Vue");
		// Widget écrivain lié à l'entrée `dcy`.
		hmiPage.addWidget(
			HmiWidget.create("push-button", 10, 10, undefined, {
				variable: "dcy",
				label: "Départ",
				behavior: "set",
			}),
		);
		// Widget dont la position est animée par `pos` (piloté par le grafcet).
		const animatedRect = HmiWidget.create("rectangle", 0, 0, undefined, {
			animations: { position: { xVariable: "pos" } },
		});
		hmiPage.addWidget(animatedRect);

		let cycleError: Error | null = null;
		const plc = compileToPLC(project, 10, Dialect.FR, {
			onCycleError: (e) => (cycleError = e),
		});
		expect(plc).not.toBeNull();

		const readValue = (mnemonic: string) => getVariableValue(plc!, mnemonic);

		plc!.setPhysicalInputValueByName("dcy", false);
		plc!.start();
		await jest.advanceTimersByTimeAsync(100);
		if (cycleError) throw cycleError;

		// État initial : E0 active, aucune animation.
		expectVariableValue(plc!, "X0", true);
		expect(resolvePositionAnimationOffset(animatedRect, readValue)).toEqual({
			dx: 0,
			dy: 0,
		});

		// Événement du bouton poussoir « set » : écrit `true` dans la variable liée `dcy`
		// (résolution identique à `HmiCanvas.setVariableValue`).
		const bound = project.variables.find((v) => v.mnemonic === "dcy");
		expect(bound?.getDirection()).toBe("IN");
		plc!.setPhysicalInputValueById(bound!.id, true);

		await jest.advanceTimersByTimeAsync(100);
		if (cycleError) throw cycleError;

		// Le grafcet a franchi E0 → E1, l'action a écrit `pos`, l'animation du rectangle suit.
		expectVariableValue(plc!, "X1", true);
		expectVariableValue(plc!, "pos", 40);
		expect(resolvePositionAnimationOffset(animatedRect, readValue)).toEqual({
			dx: 40,
			dy: 0,
		});

		plc!.stop();
	});

	it("bouton poussoir → mémoire → section Ladder → sortie lue par un voyant (`indicator`)", async () => {
		// Ladder : borne ─ contact NO `cmd` ─ bobine `Q0`.
		const project: Project = ProjectFactory.create(
			[
				VariableFactory.createMemoryBool("cmd"),
				VariableFactory.createLogicOutput("Q0"),
			],
			[],
		);
		const ladder = project.createLadder("Ladder 1");
		wireLadderIntoMain(project, ladder);
		const [section] = ladder.sections;
		const rail = createRailTerminalElement(0);
		const contact = createContactElement("cmd", "NO", 0, 0);
		const coil = createCoilElement("Q0", "normal", 0, 1);
		ladder.addElements(section.id, [rail, contact, coil]);
		ladder.addConnections(section.id, [
			new Connection(createRandomId(), { id: rail.id, type: "contact", handle: "source" }, { id: contact.id, type: "coil", handle: "target" }),
			new Connection(createRandomId(), { id: contact.id, type: "contact", handle: "source" }, { id: coil.id, type: "coil", handle: "target" }),
		]);

		const hmiPage = project.createHmiPage("Vue");
		hmiPage.addWidget(
			HmiWidget.create("push-button", 10, 10, undefined, {
				variable: "cmd",
				label: "Marche",
				behavior: "set",
			}),
		);
		hmiPage.addWidget(
			HmiWidget.create("indicator", 0, 0, undefined, { variable: "Q0", label: "Voyant" }),
		);

		let cycleError: Error | null = null;
		const plc = compileToPLC(project, 10, Dialect.FR, {
			onCycleError: (e) => (cycleError = e),
		});
		expect(plc).not.toBeNull();

		// Valeur qu'un `indicator` lit (voir `HmiWidgetItem` → `Indicator`, `Boolean(value)`).
		const indicatorReads = () => Boolean(getVariableValue(plc!, "Q0"));

		plc!.start();
		await jest.advanceTimersByTimeAsync(50);
		if (cycleError) throw cycleError;
		expect(indicatorReads()).toBe(false);

		// Bouton « set » sur variable mémoire : résolution identique à `HmiCanvas.setVariableValue`.
		const cmd = project.variables.find((v) => v.mnemonic === "cmd")!;
		expect(cmd.getDirection()).not.toBe("IN");
		plc!.setMemoryValueById(cmd.id, true);
		await jest.advanceTimersByTimeAsync(50);
		if (cycleError) throw cycleError;
		expect(indicatorReads()).toBe(true);

		// Bouton « reset » : la bobine normale retombe au cycle suivant.
		plc!.setMemoryValueById(cmd.id, false);
		await jest.advanceTimersByTimeAsync(50);
		plc!.stop();
		if (cycleError) throw cycleError;
		expect(indicatorReads()).toBe(false);
	});

	it("action numérique d'un grafcet → animation de niveau (axe vertical) d'un widget", async () => {
		// Grafcet : E0 ─[VRAI]→ E1 (action continue `niveau := 60`) ─[VRAI]→ E0.
		const grafcet = GrafcetFactory.createNumericActionCycle("g", "niveau := 60");

		const project: Project = ProjectFactory.create(
			[VariableFactory.createMemoryInt("niveau")],
			[grafcet],
		);

		const hmiPage = project.createHmiPage("Vue");
		const tank = HmiWidget.create("rectangle", 0, 0, undefined, {
			animations: { position: { yVariable: "niveau" } },
		});
		hmiPage.addWidget(tank);

		let cycleError: Error | null = null;
		const plc = compileToPLC(project, 10, Dialect.FR, {
			onCycleError: (e) => (cycleError = e),
		});
		expect(plc).not.toBeNull();

		const readValue = (mnemonic: string) => getVariableValue(plc!, mnemonic);

		expect(resolvePositionAnimationOffset(tank, readValue)).toEqual({ dx: 0, dy: 0 });

		plc!.start();
		await jest.advanceTimersByTimeAsync(100);
		plc!.stop();
		if (cycleError) throw cycleError;

		expectVariableValue(plc!, "niveau", 60);
		expect(resolvePositionAnimationOffset(tank, readValue)).toEqual({ dx: 0, dy: 60 });
	});
});
