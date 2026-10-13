import Project from "@/schemas/project/project.schema";
import { getSceneDescriptor } from "@/3d-scenes/scene.registry";
import { compilePipelineDetailed } from "@tests/utils/test-helpers";
import {
	createCartonSortingProject,
	createCartonSortingSolution,
} from "./carton-sorting.template";

describe("carton-sorting.template", () => {
	describe("createCartonSortingProject (exercice)", () => {
		let project: Project;

		beforeEach(() => {
			project = createCartonSortingProject();
		});

		it("déclare l'entrée, les sorties, les capteurs, le compteur et la page HMI", () => {
			const mnemonics = project.variables.map((v) => v.mnemonic);
			expect(mnemonics).toEqual(
				expect.arrayContaining([
					"dcy",
					"Cmd_T1",
					"Cmd_P1_out",
					"Cmd_P3_in",
					"cpt_psce_c",
					"cpt_c_hte",
					"C",
				]),
			);
			expect(Object.values(project.hmiPages)).toHaveLength(1);
		});

		it("n'embarque plus de programme de partie opérative", () => {
			expect(
				Object.values(project.ladders).filter((l) => l.role !== "main"),
			).toHaveLength(0);
			expect(project.main.sections.flatMap((s) => s.elements)).toHaveLength(0);
		});

		it("déclare les capteurs en entrées et les actionneurs en sorties", () => {
			const zoneOf = (mnemonic: string) =>
				project.variables.find((v) => v.mnemonic === mnemonic)?.zone;
			expect(zoneOf("cpt_p1_out")).toBe("logic-input");
			expect(zoneOf("cpt_psce_c")).toBe("logic-input");
			expect(zoneOf("Cmd_T1")).toBe("logic-output");
			expect(zoneOf("Cmd_P2_in")).toBe("logic-output");
		});

		it("donne à l'entrée de départ le comportement d'un bouton-poussoir", () => {
			const behaviorKinds = Object.fromEntries(
				project.variables
					.filter((v) => v.mnemonic === "dcy")
					.map((v) => [v.mnemonic, v.behavior?.kind ?? null]),
			);
			expect(behaviorKinds).toEqual({ dcy: "push-button-no" });
		});

		it("câble chaque point de la scène 3D sur une variable existante de la bonne zone", () => {
			const scene = project.scene3d!;
			const descriptor = getSceneDescriptor(scene.sceneId)!;
			expect(Object.keys(scene.bindings).sort()).toEqual(
				descriptor.points.map((p) => p.id).sort(),
			);
			for (const point of descriptor.points) {
				const variable = project.variables.find(
					(v) => v.id === scene.bindings[point.id],
				);
				expect(variable?.mnemonic).toBe(point.suggestedMnemonic);
				expect(variable?.zone).toBe(
					point.kind === "sensor" ? "logic-input" : "logic-output",
				);
			}
		});

		it("ne garde sur la page HMI que le pupitre, le compteur et les voyants", () => {
			const widgets = Object.values(Object.values(project.hmiPages)[0].widgets);
			expect(widgets.some((w) => w.name === "Caisse")).toBe(false);
			expect(widgets.some((w) => w.name === "BP départ")).toBe(true);
			expect(widgets.some((w) => w.name === "Compteur caisses")).toBe(true);
			expect(widgets.some((w) => w.name.startsWith("Voyant "))).toBe(true);
			expect(widgets.some((w) => w.name === "Indication scène 3D")).toBe(true);
		});

		it("passe l'analyse sans erreur (le projet seul, sans commande, est valide)", () => {
			const { analysis } = compilePipelineDetailed(project);
			expect(
				analysis.issues.filter((i) => i.severity === "error"),
			).toHaveLength(0);
		});
	});

	describe("createCartonSortingSolution (correction)", () => {
		let project: Project;

		beforeEach(() => {
			project = createCartonSortingSolution();
		});

		it("tient dans une page A4 portrait (≈ 794 × 1123 px)", () => {
			const grafcet = Object.values(project.grafcets)[0];
			const elements = grafcet.getAllElements();
			const right = Math.max(
				...elements.map((e) => e.position.x + e.size.width),
			);
			const bottom = Math.max(
				...elements.map((e) => e.position.y + e.size.height),
			);
			expect(right).toBeLessThanOrEqual(794);
			expect(bottom).toBeLessThanOrEqual(1123);
		});

		it("passe le pipeline complet sans erreur d'analyse ni de compilation", () => {
			const { analysis, preCompilation, compilation } =
				compilePipelineDetailed(project);
			expect(
				analysis.issues.filter((i) => i.severity === "error"),
			).toHaveLength(0);
			expect(preCompilation.errors).toHaveLength(0);
			expect(compilation.errors).toHaveLength(0);
			expect(compilation.result).toBeDefined();
		});

		it("conserve la scène 3D de l'exercice", () => {
			expect(project.scene3d?.sceneId).toBe("carton-sorting");
		});
	});
});
