import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Project from "@/schemas/project/project.schema";
import {
	createOrDivergenceProject,
	createOrDivergenceSolution,
} from "./or-divergence.template";
import { compilePipelineDetailed } from "@tests/utils/test-helpers";

describe("or-divergence.template", () => {
	describe("createOrDivergenceProject (exercice)", () => {
		let project: Project;

		beforeEach(() => {
			project = createOrDivergenceProject();
		});

		it("produit un projet valide", () => {
			expect(project).toBeInstanceOf(Project);
			expect(project.id).toBeTruthy();
		});

		it("déclare les variables d'entrée/sortie attendues", () => {
			const mnemonics = project.variables.map((v) => v.mnemonic);
			expect(mnemonics).toEqual(
				expect.arrayContaining([
					"dcy1",
					"dcy2",
					"fin1",
					"fin2",
					"sortie1",
					"sortie2",
				]),
			);
		});

		it("donne aux entrées le comportement de leur organe physique (capteurs laissés libres)", () => {
			const behaviorKinds = Object.fromEntries(
				project.variables
					.filter((v) => v.zone === "logic-input")
					.map((v) => [v.mnemonic, v.behavior?.kind ?? null]),
			);
			expect(behaviorKinds).toEqual({
				dcy1: "push-button-no",
				dcy2: "push-button-no",
				fin1: null,
				fin2: null,
			});
		});

		it("passe l'analyse sans erreur (projet sans programme est valide)", () => {
			const { analysis } = compilePipelineDetailed(project);
			const errors = analysis.issues.filter((i) => i.severity === "error");
			expect(errors).toHaveLength(0);
		});
	});

	describe("createOrDivergenceSolution (correction)", () => {
		let project: Project;

		beforeEach(() => {
			project = createOrDivergenceSolution();
		});

		it("produit un projet valide", () => {
			expect(project).toBeInstanceOf(Project);
			expect(project.id).toBeTruthy();
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

		it("contient une divergence en OU à 2 branches, sans convergence dédiée (chaque branche reboucle seule)", () => {
			const [grafcet] = Object.values(project.programs).filter(
				(program) => program.type === "grafcet",
			) as Grafcet[];
			expect(Object.keys(grafcet.junctionsOrStarts)).toHaveLength(1);
			expect(Object.keys(grafcet.junctionsOrEnds)).toHaveLength(0);
			expect(Object.keys(grafcet.junctionsAndStarts)).toHaveLength(0);

			const [jos] = Object.values(grafcet.junctionsOrStarts);
			expect(jos.data.branchesOrder).toHaveLength(2);
		});
	});
});
