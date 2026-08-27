import Project from "@/schemas/project/project.schema";
import { getElementWidth } from "@/schemas/ladder/element.schema";
import { Dialect } from "@/expression-language/dialect.enum";
import {
	createDrillingProject,
	createDrillingSolution,
} from "./drilling.template";
import {
	compilePipelineDetailed,
	compileToPLC,
	getVariableValue,
} from "@tests/utils/test-helpers";

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

		it("fournit le modèle de partie opérative en Ladder, référencé par le Main", () => {
			const ladders = Object.values(project.ladders);
			const operative = ladders.find((l) => l.name === "Partie opérative");
			expect(operative).toBeDefined();
			expect(operative!.sections[0].description).not.toBe("");
			const mainCallsIt = project.main.sections
				.flatMap((s) => s.elements)
				.some(
					(e) =>
						e.type === "block" &&
						e.data.blockType === "user-program" &&
						e.data.params.programId === operative!.id,
				);
			expect(mainCallsIt).toBe(true);
		});

		it("espace les éléments de chaque réseau du modèle (jamais deux blocs collés)", () => {
			const operative = Object.values(project.ladders).find(
				(l) => l.name === "Partie opérative",
			);
			const byRow = new Map<number, { col: number; width: number }[]>();
			for (const element of operative!.sections[0].elements) {
				if (element.type === "railTerminal") continue;
				const row = element.position.row;
				const list = byRow.get(row) ?? [];
				list.push({
					col: element.position.col,
					width: getElementWidth(element),
				});
				byRow.set(row, list);
			}
			for (const list of byRow.values()) {
				list.sort((a, b) => a.col - b.col);
				for (let i = 1; i < list.length; i++) {
					expect(list[i].col).toBeGreaterThan(
						list[i - 1].col + list[i - 1].width,
					);
				}
			}
		});

		it("passe l'analyse sans erreur (le modèle seul, sans commande, est valide)", () => {
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

		it("conserve les variables, le modèle et la page HMI de l'exercice", () => {
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

		describe("simulation", () => {
			beforeEach(() => jest.useFakeTimers());
			afterEach(() => jest.useRealTimers());

			it("exécute un cycle complet sur appui de `dcy`, sans intervention sur les capteurs", async () => {
				let cycleError: Error | null = null;
				const plc = compileToPLC(project, 10, Dialect.FR, {
					onCycleError: (e) => (cycleError = e),
				});
				expect(plc).not.toBeNull();

				plc!.setPhysicalInputValueByName("dcy", false);
				plc!.start();
				await jest.advanceTimersByTimeAsync(50);
				expect(getVariableValue(plc!, "h")).toBe(true);
				expect(getVariableValue(plc!, "position")).toBe(0);

				// Appui départ cycle
				plc!.setPhysicalInputValueByName("dcy", true);
				await jest.advanceTimersByTimeAsync(30);
				plc!.setPhysicalInputValueByName("dcy", false);

				// Descente : le foret atteint le bas
				await jest.advanceTimersByTimeAsync(1500);
				if (cycleError) throw cycleError;
				expect(getVariableValue(plc!, "position")).toBe(100);
				expect(getVariableValue(plc!, "b")).toBe(true);

				// Perçage (2 s) puis remontée : retour en haut
				await jest.advanceTimersByTimeAsync(5000);
				if (cycleError) throw cycleError;
				expect(getVariableValue(plc!, "position")).toBe(0);
				expect(getVariableValue(plc!, "h")).toBe(true);
				expect(getVariableValue(plc!, "descendre")).toBe(false);
				expect(getVariableValue(plc!, "monter")).toBe(false);

				plc!.stop();
			});
		});
	});
});
