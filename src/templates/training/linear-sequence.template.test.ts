import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Project from "@/schemas/project/project.schema";
import {
	createLinearSequenceProject,
	createLinearSequenceSolution,
} from "./linear-sequence.template";
import { compilePipelineDetailed } from "@tests/utils/test-helpers";

describe("linear-sequence.template", () => {
	describe("createLinearSequenceProject (exercice)", () => {
		let project: Project;

		beforeEach(() => {
			project = createLinearSequenceProject();
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
					"fin1",
					"fin2",
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

	describe("createLinearSequenceSolution (correction)", () => {
		let project: Project;

		beforeEach(() => {
			project = createLinearSequenceSolution();
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

		it("ne contient qu'une seule chaîne d'étapes, sans jonction", () => {
			const [grafcet] = Object.values(project.programs).filter(
				(program) => program.type === "grafcet",
			) as Grafcet[];
			expect(Object.keys(grafcet.junctionsAndStarts)).toHaveLength(0);
			expect(Object.keys(grafcet.junctionsOrStarts)).toHaveLength(0);
			expect(Object.keys(grafcet.steps)).toHaveLength(4);
		});
	});
});
