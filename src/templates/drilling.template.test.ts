import { getSceneDescriptor } from "@/3d-scenes/scene.registry";
import Project from "@/schemas/project/project.schema";
import {
	createDrillingProject,
	createDrillingSolution,
} from "./drilling.template";
import { compilePipelineDetailed } from "@tests/utils/test-helpers";

describe("drilling.template", () => {
	describe("createDrillingProject (exercice)", () => {
		let project: Project;

		beforeEach(() => {
			project = createDrillingProject();
		});

		it("produit un projet valide", () => {
			expect(project).toBeInstanceOf(Project);
			expect(project.id).toBeTruthy();
		});

		it("déclare l'entrée, les sorties et les mémoires du modèle", () => {
			const mnemonics = project.variables.map((v) => v.mnemonic);
			expect(mnemonics).toEqual(
				expect.arrayContaining([
					"dcy",
					"descendre",
					"monter",
					"broche",
					"h",
					"b",
					"position",
				]),
			);
		});

		it("n'a plus de Ladder de partie opérative : la scène 3D la remplace", () => {
			expect(Object.values(project.ladders).map((l) => l.name)).toEqual(["Main"]);
			expect(project.main.sections.flatMap((s) => s.elements)).toHaveLength(0);
		});

		it("déclare les capteurs de la scène en entrées (h, b logiques, position analogique entière)", () => {
			const byMnemonic = Object.fromEntries(
				project.variables.map((v) => [v.mnemonic, v]),
			);
			expect(byMnemonic.h.zone).toBe("logic-input");
			expect(byMnemonic.b.zone).toBe("logic-input");
			expect(byMnemonic.position.zone).toBe("analog-input");
			expect(byMnemonic.position.type).toBe("INT");
		});

		it("câble chaque point de la scène 3D sur une variable existante de la bonne zone", () => {
			const scene = project.scene3d!;
			const descriptor = getSceneDescriptor(scene.sceneId)!;
			expect(scene.sceneId).toBe("drilling");
			expect(Object.keys(scene.bindings).sort()).toEqual(
				descriptor.points.map((p) => p.id).sort(),
			);
			const sensorZones = ["logic-input", "analog-input"];
			for (const point of descriptor.points) {
				const variable = project.variables.find(
					(v) => v.id === scene.bindings[point.id],
				);
				expect(variable?.mnemonic).toBe(point.suggestedMnemonic);
				if (point.kind === "sensor") {
					expect(sensorZones).toContain(variable?.zone);
				} else {
					expect(variable?.zone).toBe("logic-output");
				}
			}
		});

		it("garde tous les éléments de la page HMI : bâti, table, pièce, broche animée, bouton, voyants", () => {
			const widgets = Object.values(Object.values(project.hmiPages)[0].widgets);
			expect(widgets.map((w) => w.name)).toEqual(
				expect.arrayContaining([
					"Titre",
					"Bâti",
					"Table",
					"Pièce",
					"Broche",
					"BP départ",
					"Voyant descendre",
					"Voyant monter",
					"Voyant broche",
					"Voyant h",
					"Voyant b",
				]),
			);
			expect(widgets).toHaveLength(11);
		});

		it("donne aux entrées le comportement de leur organe physique", () => {
			const behaviorKinds = Object.fromEntries(
				project.variables
					.filter((v) => v.zone === "logic-input")
					.map((v) => [v.mnemonic, v.behavior?.kind ?? null]),
			);
			expect(behaviorKinds).toEqual({
				dcy: "push-button-no",
				h: null,
				b: null,
			});
		});

		it("passe l'analyse sans erreur (la scène seule, sans commande, est valide)", () => {
			const { analysis } = compilePipelineDetailed(project);
			const errors = analysis.issues.filter((i) => i.severity === "error");
			expect(errors).toHaveLength(0);
		});
	});

	describe("createDrillingSolution (correction)", () => {
		let project: Project;

		beforeEach(() => {
			project = createDrillingSolution();
		});

		it("conserve les variables, la scène 3D et la page HMI de l'exercice", () => {
			const mnemonics = project.variables.map((v) => v.mnemonic);
			expect(mnemonics).toEqual(
				expect.arrayContaining(["dcy", "descendre", "h", "b", "position"]),
			);
			expect(Object.values(project.hmiPages)).toHaveLength(1);
		});

		it("passe le pipeline complet sans erreur d'analyse ni de compilation", () => {
			const { analysis, preCompilation, compilation } =
				compilePipelineDetailed(project);

			const errors = analysis.issues.filter((i) => i.severity === "error");
			expect(errors).toHaveLength(0);
			expect(preCompilation.errors).toHaveLength(0);
			expect(compilation.errors).toHaveLength(0);
			expect(compilation.result).toBeDefined();
		});
	});
});
