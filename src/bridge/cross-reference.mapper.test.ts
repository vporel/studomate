import type { CrossReference } from "@/project-analyser/cross-reference/cross-reference.types";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import HmiPage from "@/schemas/hmi/hmi-page.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Project from "@/schemas/project/project.schema";
import CrossReferenceMapper from "./cross-reference.mapper";

function project(): Project {
	const p = new Project("p1", "P", "");
	p.addProgram(new GrafcetBuilder().id("g1").name("Cycle principal").build());
	p.addProgram(new Ladder("lad1", "Sécurités", []));
	p.updateHmiPage(new HmiPage("hmi1", "Vue conduite"));
	return p;
}

const crossRefs: CrossReference[] = [
	{
		variableName: "Moteur",
		references: [
			{
				access: "write",
				programId: "lad1",
				programType: "ladder",
				locationId: "coil-1",
				locationKind: "ladder-coil",
				locationParams: { sectionTitle: "Marche", gridRow: 1 },
			},
			{
				access: "read",
				programId: "g1",
				programType: "grafcet",
				locationId: "t1",
				locationKind: "grafcet-transition",
				locationParams: {},
			},
		],
	},
];

describe("CrossReferenceMapper", () => {
	it("sépare lecteurs et écrivains et résout le nom du programme", () => {
		const [row] = CrossReferenceMapper.analyserToApp(crossRefs, project(), "fr");
		expect(row.variableName).toBe("Moteur");
		expect(row.writers).toHaveLength(1);
		expect(row.readers).toHaveLength(1);
		expect(row.writers[0]).toMatchObject({
			programId: "lad1",
			programType: "ladder",
			locationId: "coil-1",
		});
		expect(row.writers[0].label).toContain("Sécurités");
		expect(row.writers[0].label).toContain("Marche");
		expect(row.readers[0].label).toContain("Cycle principal");
	});

	it("localise le libellé en anglais", () => {
		const [row] = CrossReferenceMapper.analyserToApp(crossRefs, project(), "en");
		expect(row.writers[0].label).toContain("coil");
		expect(row.readers[0].label).toContain("transition receptivity");
	});

	it("compose le libellé d'une pinoche de bloc à partir du nom ou du type", () => {
		const [row] = CrossReferenceMapper.analyserToApp(
			[
				{
					variableName: "Consigne",
					references: [
						{
							access: "read",
							programId: "lad1",
							programType: "ladder",
							locationId: "blk-1",
							locationKind: "ladder-block-pin",
							locationParams: {
								sectionTitle: "Tempo",
								blockType: "timer",
								blockName: "Tempo1",
								port: "PT",
							},
						},
					],
				},
			],
			project(),
			"fr",
		);
		expect(row.readers[0].label).toContain("Tempo1");
		expect(row.readers[0].label).toContain("PT");
	});

	it("résout le nom de page et le type de widget pour une référence HMI", () => {
		const [row] = CrossReferenceMapper.analyserToApp(
			[
				{
					variableName: "Marche",
					references: [
						{
							access: "write",
							programId: "hmi1",
							programType: "hmi",
							locationId: "w1",
							locationKind: "hmi-widget-binding",
							locationParams: {
								widgetName: "BP_1",
								widgetType: "push-button",
							},
						},
					],
				},
			],
			project(),
			"fr",
		);
		expect(row.writers[0].label).toContain("Vue conduite");
		expect(row.writers[0].label).toContain("BP_1");
		expect(row.writers[0].label).toContain("bouton");
		expect(row.writers[0]).toMatchObject({ programType: "hmi", locationId: "w1" });
	});

	it("remplace un numéro d'étape manquant par un marqueur", () => {
		const [row] = CrossReferenceMapper.analyserToApp(
			[
				{
					variableName: "Moteur",
					references: [
						{
							access: "write",
							programId: "g1",
							programType: "grafcet",
							locationId: "a1",
							locationKind: "grafcet-action-boolean",
							locationParams: {},
						},
					],
				},
			],
			project(),
			"fr",
		);
		expect(row.writers[0].label).toContain("?");
	});
});
