import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Project from "@/schemas/project/project.schema";
import {
	createAndDivergenceProject,
	createAndDivergenceSolution,
} from "./and-divergence.template";
import { compilePipelineDetailed } from "@tests/utils/test-helpers";

describe("and-divergence.template", () => {
	describe("createAndDivergenceProject (exercice)", () => {
		let project: Project;

		beforeEach(() => {
			project = createAndDivergenceProject();
		});

		it("produit un projet valide", () => {
			expect(project).toBeInstanceOf(Project);
			expect(project.id).toBeTruthy();
		});

		it("déclare les variables d'entrée/sortie attendues", () => {
			const mnemonics = project.variables.map((v) => v.mnemonic);
			expect(mnemonics).toEqual(
				expect.arrayContaining([
					"dcy",
					"capteur1",
					"capteur2",
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
				dcy: "push-button-no",
				capteur1: null,
				capteur2: null,
			});
		});

		it("fournit un grafcet vide à dessiner, nommé comme la solution", () => {
			const grafcets = Object.values(project.grafcets);
			expect(grafcets).toHaveLength(1);
			expect(grafcets[0].isEmpty()).toBe(true);
			expect(grafcets[0].name).toBe(
				Object.values(createAndDivergenceSolution().grafcets)[0].name,
			);
		});

		it("passe l'analyse, la pré-compilation et la compilation sans erreur (le grafcet vide n'est pas exécuté)", () => {
			const { analysis, preCompilation, compilation } =
				compilePipelineDetailed(project);
			const errors = analysis.issues.filter((i) => i.severity === "error");
			expect(errors).toHaveLength(0);
			expect(preCompilation.errors).toHaveLength(0);
			expect(compilation.errors).toHaveLength(0);
		});
	});

	describe("createAndDivergenceSolution (correction)", () => {
		let project: Project;

		beforeEach(() => {
			project = createAndDivergenceSolution();
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

		it("contient une divergence en ET à 2 branches refermée par sa convergence", () => {
			const [grafcet] = Object.values(project.programs).filter(
				(program) => program.type === "grafcet",
			) as Grafcet[];
			expect(Object.keys(grafcet.junctionsAndStarts)).toHaveLength(1);
			expect(Object.keys(grafcet.junctionsAndEnds)).toHaveLength(1);
			expect(Object.keys(grafcet.junctionsOrStarts)).toHaveLength(0);

			const [jas] = Object.values(grafcet.junctionsAndStarts);
			const [jae] = Object.values(grafcet.junctionsAndEnds);
			expect(jas.data.branchesOrder).toHaveLength(2);
			expect(jae.data.branchesOrder).toHaveLength(2);
		});
	});

	describe("langue", () => {
		it("garde les noms français par défaut et en fr", () => {
			for (const project of [
				createAndDivergenceSolution(),
				createAndDivergenceSolution("fr"),
			]) {
				expect(project.name).toBe("Divergence en ET : solution");
				expect(Object.values(project.grafcets).map((g) => g.name)).toEqual([
					"Divergence en ET",
				]);
			}
			expect(createAndDivergenceProject().name).toBe("Divergence en ET");
		});

		it("nomme le projet et le programme en anglais, sans accent", () => {
			const project = createAndDivergenceSolution("en");
			const names = [
				project.name,
				...Object.values(project.grafcets).map((g) => g.name),
			];
			expect(names).toEqual(["AND divergence: solution", "AND divergence"]);
			expect(createAndDivergenceProject("en").name).toBe("AND divergence");
			expect(names.join("")).not.toMatch(/[À-ÿ]/);
		});
	});
});
