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

		it("passe l'analyse sans erreur (projet sans programme est valide)", () => {
			const { analysis } = compilePipelineDetailed(project);
			const errors = analysis.issues.filter((i) => i.severity === "error");
			expect(errors).toHaveLength(0);
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
});
