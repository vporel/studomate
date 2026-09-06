import Project from "@/schemas/project/project.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import { Dialect } from "@/expression-language/dialect.enum";
import Connection from "@/schemas/ladder/connection.schema";
import {
	createCoilElement,
	createContactElement,
	createRailTerminalElement,
} from "@/schemas/ladder/element.schema";
import { createTimerBlockElement } from "@/schemas/ladder/function-blocks/timer.schema";
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import { createRandomId } from "@/ids";
import LocalStorageProjectRepository from "./local-storage.project.repository";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { VariableFactory } from "@tests/utils/variable-factory";

/** localStorage minimal, l'environnement de test étant en `node`. */
function installLocalStorage() {
	const store = new Map<string, string>();
	(globalThis as any).localStorage = {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => store.set(k, v),
		removeItem: (k: string) => store.delete(k),
		clear: () => store.clear(),
	};
	return store;
}

/**
 * Projet exerçant un maximum de la forme persistée : variables de plusieurs types, grafcet
 * (étapes/transitions/actions/connexions), ladder secondaire (contact/bobine/bloc timer),
 * pages HMI avec widgets interactifs et formes, énoncé, dialecte non-défaut.
 */
function buildRichProject(): Project {
	VariableFactory.reset();
	const variables = [
		VariableFactory.createLogicInput("I0"),
		VariableFactory.createLogicOutput("Q0"),
		VariableFactory.createMemoryBool("M0"),
		VariableFactory.createMemoryInt("Compteur"),
		VariableFactory.createAnalogInput("Niveau"),
	];

	const grafcet: Grafcet = GrafcetFactory.createCycleWithBooleanActions(
		"grafcet-1",
		"Q0",
		"M0",
		"I0",
		"NON I0",
	);

	const project = new Project("rich-project", "Projet complet", "auteur");
	project.variables = variables;
	project.addProgram(grafcet);

	const ladder: Ladder = project.createLadder("Ladder auxiliaire");
	const [section] = ladder.sections;
	const rail = createRailTerminalElement(0);
	const contact = createContactElement("I0", "NO", 0, 0);
	const coil = createCoilElement("Q0", "normal", 0, 1);
	const timer = createTimerBlockElement(
		{ name: "T1", timerType: "TON", pt: "T#5s", et: "Ecoule" },
		2,
		0,
	);
	ladder.addElements(section.id, [rail, contact, coil, timer]);
	ladder.addConnections(section.id, [
		new Connection(
			createRandomId(),
			{ id: rail.id, type: "contact", handle: "source" },
			{ id: contact.id, type: "contact", handle: "target" },
		),
		new Connection(
			createRandomId(),
			{ id: contact.id, type: "contact", handle: "source" },
			{ id: coil.id, type: "coil", handle: "target" },
		),
	]);

	const pageA = project.createHmiPage("Vue principale");
	pageA.addWidget(
		HmiWidget.create("push-button", 10, 20, undefined, {
			variable: "I0",
			label: "Marche",
			behavior: "set",
		}),
	);
	pageA.addWidget(
		HmiWidget.create("indicator", 120, 20, undefined, { variable: "Q0" }),
	);
	pageA.addWidget(
		HmiWidget.create("gauge", 10, 120, undefined, {
			variable: "Niveau",
			min: 0,
			max: 200,
		}),
	);
	const pageB = project.createHmiPage("Vue secondaire");
	pageB.addWidget(
		HmiWidget.create("rectangle", 0, 0, { width: 200, height: 100 }),
	);
	pageB.addWidget(
		HmiWidget.create("text", 20, 20, undefined, { text: "Zone de tri" }),
	);
	project.setMainHmiPage(pageB.id);

	project.exercise = { statement: "# Consigne\n\nDémarrer le convoyeur sur `I0`." };
	project.setDialect(Dialect.EN);

	return project;
}

describe("LocalStorageProjectRepository — aller-retour d'un projet complexe", () => {
	beforeEach(() => {
		installLocalStorage();
	});

	it("relit à l'identique un projet exerçant toute la forme persistée", async () => {
		const original = buildRichProject();
		const repo = new LocalStorageProjectRepository();

		expect(await repo.save(original)).toEqual({ ok: true });

		const reloaded = await repo.get("rich-project");
		expect(reloaded).toBeInstanceOf(Project);
		// `toEqual` compare la forme énumérable en profondeur : casse dès qu'un champ écrit par
		// `save` n'est pas relu par `createFromJSON` (ou inversement), ou qu'une structure non
		// sérialisable (Map/Set) apparaît dans le domaine.
		expect(reloaded).toEqual(original);
	});

	it("relit le même projet via list()", async () => {
		const original = buildRichProject();
		const repo = new LocalStorageProjectRepository();
		await repo.save(original);

		const { projects, skipped } = await repo.list();

		expect(skipped).toEqual([]);
		expect(projects).toHaveLength(1);
		expect(projects[0]).toEqual(original);
	});

	it("préserve les types concrets des programmes après relecture", async () => {
		const original = buildRichProject();
		const repo = new LocalStorageProjectRepository();
		await repo.save(original);

		const reloaded = (await repo.get("rich-project"))!;

		expect(Object.values(reloaded.grafcets)).toHaveLength(1);
		expect(Object.values(reloaded.grafcets)[0]).toBeInstanceOf(Grafcet);
		// Main + ladder auxiliaire.
		expect(Object.values(reloaded.ladders)).toHaveLength(2);
		expect(Object.values(reloaded.ladders)[0]).toBeInstanceOf(Ladder);
		expect(reloaded.dialect).toBe(Dialect.EN);
		expect(reloaded.exercise?.statement).toBe(original.exercise?.statement);
	});
});
