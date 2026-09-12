import CrossReferenceMapper from "@/bridge/cross-reference.mapper";
import CrossReferenceCollector from "@/project-analyser/cross-reference/cross-reference-collector";
import {
	ActionExecutionMode,
	ActionType,
} from "@/schemas/grafcet/action.schema";
import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import { createCompareBlockElement } from "@/schemas/ladder/block.schema";
import {
	createCoilElement,
	createContactElement,
} from "@/schemas/ladder/element.schema";
import { createTimerBlockElement } from "@/schemas/ladder/function-blocks/timer.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Section from "@/schemas/ladder/section.schema";
import HmiPage from "@/schemas/hmi/hmi-page.schema";
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import Project from "@/schemas/project/project.schema";

/**
 * Bout en bout : un projet où une grandeur (`NiveauCuve`) est produite par une section ladder et
 * consommée par une autre section et par un grafcet — le scénario « reprendre un projet »
 * (localiser qui lit / écrit une variable qui circule entre programmes).
 */
function buildProject(): Project {
	const project = new Project("tri", "Tri", "");

	const ladder = new Ladder("lad-tri", "Partie opérative", [
		new Section("sec-mesure", "Mesure", "", [
			createContactElement("Marche", "NO", 0, 0),
			createTimerBlockElement(
				{ name: "Filtre", timerType: "TON", pt: "T#1s", et: "NiveauCuve" },
				0,
				1,
			),
		]),
		new Section("sec-seuil", "Seuil", "", [
			createCompareBlockElement(0, 0, {
				in1: "NiveauCuve",
				in2: "SeuilHaut",
				operator: ">",
			}),
			createCoilElement("CuvePleine", "normal", 0, 2),
		]),
	]);
	project.addProgram(ladder);

	const grafcet = new GrafcetBuilder()
		.id("g-tri")
		.name("Cycle de tri")
		.addTransition(
			new TransitionBuilder().id("t-plein").expression("CuvePleine ET NiveauCuve").build(),
		)
		.addAction(
			new ActionBuilder()
				.id("a-vidange")
				.type(ActionType.BOOLEAN_VARIABLE)
				.executionMode(ActionExecutionMode.SET)
				.expression("Vidange")
				.build(),
		)
		.build();
	project.addProgram(grafcet);

	const hmiPage = new HmiPage("hmi-conduite", "Conduite");
	hmiPage.addWidget(
		HmiWidget.create("indicator", 0, 0, undefined, { variable: "CuvePleine" }),
	);
	hmiPage.addWidget(
		HmiWidget.create("push-button", 0, 0, undefined, { variable: "Marche" }),
	);
	project.updateHmiPage(hmiPage);

	return project;
}

describe("Références croisées — intégration", () => {
	it("trace une grandeur écrite dans une section et lue ailleurs + dans un grafcet", () => {
		const crossRefs = CrossReferenceCollector.collect(buildProject());
		const niveau = crossRefs.find((c) => c.variableName === "NiveauCuve")!;

		const writers = niveau.references.filter((r) => r.access === "write");
		const readers = niveau.references.filter((r) => r.access === "read");

		// écrite une seule fois : la pinoche ET du timer de la section Mesure
		expect(writers).toHaveLength(1);
		expect(writers[0]).toMatchObject({
			programId: "lad-tri",
			locationKind: "ladder-block-pin",
		});

		// lue par le bloc compare de la section Seuil ET par la réceptivité du grafcet
		expect(readers.map((r) => r.programType).sort()).toEqual(["grafcet", "ladder"]);
	});

	it("produit des libellés localisés navigables via le mapper", () => {
		const project = buildProject();
		const rows = CrossReferenceMapper.analyserToApp(
			CrossReferenceCollector.collect(project),
			project,
			"fr",
		);
		const cuvePleine = rows.find((r) => r.variableName === "CuvePleine")!;
		expect(cuvePleine.writers[0].label).toContain("Partie opérative");
		expect(cuvePleine.writers[0].label).toContain("Seuil");
		expect(cuvePleine.readers[0]).toMatchObject({
			programId: "g-tri",
			programType: "grafcet",
			locationId: "t-plein",
		});
	});

	it("agrège une variable lue par un voyant HMI et écrite par le ladder", () => {
		const crossRefs = CrossReferenceCollector.collect(buildProject());
		const cuvePleine = crossRefs.find((c) => c.variableName === "CuvePleine")!;
		expect(cuvePleine.references.map((r) => r.programType).sort()).toEqual([
			"grafcet",
			"hmi",
			"ladder",
		]);
		const hmiRef = cuvePleine.references.find((r) => r.programType === "hmi")!;
		expect(hmiRef).toMatchObject({
			access: "read",
			locationKind: "hmi-widget-binding",
		});
	});

	it("relève l'écriture d'un bouton poussoir HMI", () => {
		const crossRefs = CrossReferenceCollector.collect(buildProject());
		const marche = crossRefs.find((c) => c.variableName === "Marche")!;
		expect(
			marche.references.some(
				(r) => r.programType === "hmi" && r.access === "write",
			),
		).toBe(true);
	});

	it("inclut les variables exposées du timer parmi les écritures", () => {
		const crossRefs = CrossReferenceCollector.collect(buildProject());
		expect(crossRefs.find((c) => c.variableName === "Filtre.Q")).toMatchObject({
			references: [{ access: "write" }],
		});
	});
});
