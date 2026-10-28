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
				expect.arrayContaining(["dcy", "fin1", "fin2", "sortie1", "sortie2"]),
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
				fin1: null,
				fin2: null,
			});
		});

		it("fournit un grafcet vide à dessiner, nommé comme la solution", () => {
			const grafcets = Object.values(project.grafcets);
			expect(grafcets).toHaveLength(1);
			expect(grafcets[0].isEmpty()).toBe(true);
			expect(grafcets[0].name).toBe(
				Object.values(createLinearSequenceSolution().grafcets)[0].name,
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

	describe("langue", () => {
		it("garde les noms français par défaut et en fr", () => {
			for (const project of [
				createLinearSequenceSolution(),
				createLinearSequenceSolution("fr"),
			]) {
				expect(project.name).toBe("Séquence linéaire : solution");
				expect(Object.values(project.grafcets).map((g) => g.name)).toEqual([
					"Séquence",
				]);
			}
			expect(createLinearSequenceProject().name).toBe("Séquence linéaire");
		});

		it("nomme le projet et le programme en anglais, sans accent", () => {
			const project = createLinearSequenceSolution("en");
			const names = [
				project.name,
				...Object.values(project.grafcets).map((g) => g.name),
			];
			expect(names).toEqual(["Linear sequence: solution", "Sequence"]);
			expect(createLinearSequenceProject("en").name).toBe("Linear sequence");
			expect(names.join("")).not.toMatch(/[À-ÿ]/);
		});
	});
});
