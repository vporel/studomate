import Project from "@/schemas/project/project.schema";
import {
	createTrafficLightProject,
	createTrafficLightSolution,
} from "./traffic-light.template";
import { compilePipelineDetailed } from "@tests/utils/test-helpers";

describe("traffic-light.template", () => {
	describe("createTrafficLightProject (exercice)", () => {
		let project: Project;

		beforeEach(() => {
			project = createTrafficLightProject();
		});

		it("produit un projet valide", () => {
			expect(project).toBeInstanceOf(Project);
			expect(project.id).toBeTruthy();
		});

		it("déclare les 3 variables de sortie attendues", () => {
			const mnemonics = project.variables.map((v) => v.mnemonic);
			expect(mnemonics).toEqual(
				expect.arrayContaining(["rouge", "orange", "vert"]),
			);
			expect(project.variables).toHaveLength(3);
		});

		it("contient une page HMI avec 3 voyants animés par les bonnes variables", () => {
			const pages = Object.values(project.hmiPages);
			expect(pages).toHaveLength(1);
			const indicators = Object.values(pages[0].widgets).filter(
				(w) => w.type === "indicator",
			);
			expect(indicators).toHaveLength(3);
			const animatedMnemonics = indicators.map(
				(w) => (w.data as any).variable,
			);
			expect(animatedMnemonics).toEqual(
				expect.arrayContaining(["rouge", "orange", "vert"]),
			);
		});

		it("passe l'analyse sans erreur (projet sans programme est valide)", () => {
			const { analysis } = compilePipelineDetailed(project);
			const errors = analysis.issues.filter((i) => i.severity === "error");
			expect(errors).toHaveLength(0);
		});
	});

	describe("createTrafficLightSolution (correction)", () => {
		let project: Project;

		beforeEach(() => {
			project = createTrafficLightSolution();
		});

		it("produit un projet valide", () => {
			expect(project).toBeInstanceOf(Project);
			expect(project.id).toBeTruthy();
		});

		it("conserve les 3 variables et la page HMI de l'exercice", () => {
			const mnemonics = project.variables.map((v) => v.mnemonic);
			expect(mnemonics).toEqual(
				expect.arrayContaining(["rouge", "orange", "vert"]),
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

		it("produit des routines exécutables (grafcet + Main)", () => {
			const { compilation } = compilePipelineDetailed(project);
			// 1 grafcet + mémos d'étape + initialisation + 1 Main + observation des réceptivités
			expect(compilation.result!.routines).toHaveLength(5);
		});
	});
});
