import { Dialect } from "@/expression-language/dialect.enum";
import Project from "@/schemas/project/project.schema";
import {
	compilePipelineDetailed,
	compileToPLC,
	getVariableValue,
} from "@tests/utils/test-helpers";
import {
	createElevatorProject,
	createElevatorSolution,
} from "./elevator.template";

describe("elevator.template", () => {
	describe("createElevatorProject (exercice)", () => {
		let project: Project;

		beforeEach(() => {
			project = createElevatorProject();
		});

		it("produit un projet valide", () => {
			expect(project).toBeInstanceOf(Project);
			expect(project.id).toBeTruthy();
		});

		it("déclare les appels palier, les appels cabine, les sorties et les mémoires", () => {
			const mnemonics = project.variables.map((v) => v.mnemonic);
			expect(mnemonics).toEqual(
				expect.arrayContaining([
					"appel_0",
					"appel_1",
					"appel_2",
					"cabine_0",
					"cabine_1",
					"cabine_2",
					"monter",
					"descendre",
					"porte",
					"position",
					"porte_pos",
					"cabine_y",
					"etage_0",
					"etage_1",
					"etage_2",
					"porte_ouverte",
					"etage_courant",
				]),
			);
		});

		it("fournit le modèle de partie opérative en Ladder, référencé par le Main", () => {
			const operative = Object.values(project.ladders).find(
				(l) => l.name === "Partie opérative",
			);
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

		it("passe l'analyse sans erreur (le modèle seul, sans commande, est valide)", () => {
			const { analysis } = compilePipelineDetailed(project);
			const errors = analysis.issues.filter((i) => i.severity === "error");
			expect(errors).toHaveLength(0);
		});

		it("ne fournit pas de GRAFCET de commande", () => {
			expect(Object.values(project.grafcets)).toHaveLength(0);
		});
	});

	describe("createElevatorSolution (correction)", () => {
		let project: Project;

		beforeEach(() => {
			project = createElevatorSolution();
		});

		it("conserve les variables, le modèle et la page HMI de l'exercice", () => {
			const mnemonics = project.variables.map((v) => v.mnemonic);
			expect(mnemonics).toEqual(
				expect.arrayContaining(["appel_2", "cabine_0", "position", "cible"]),
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

			it("dessert un appel à l'étage 2 puis revient au RDC, sans intervention sur les capteurs", async () => {
				let cycleError: Error | null = null;
				const plc = compileToPLC(project, 10, Dialect.FR, {
					onCycleError: (e) => (cycleError = e),
				});
				expect(plc).not.toBeNull();

				plc!.start();
				await jest.advanceTimersByTimeAsync(50);
				expect(getVariableValue(plc!, "position")).toBe(0);
				expect(getVariableValue(plc!, "etage_courant")).toBe(0);

				// Appel de l'étage 2 depuis le palier
				plc!.setPhysicalInputValueByName("appel_2", true);
				await jest.advanceTimersByTimeAsync(40);
				plc!.setPhysicalInputValueByName("appel_2", false);

				// Montée jusqu'au 2ᵉ étage
				await jest.advanceTimersByTimeAsync(1500);
				if (cycleError) throw cycleError;
				expect(getVariableValue(plc!, "position")).toBe(200);
				expect(getVariableValue(plc!, "etage_2")).toBe(true);
				expect(getVariableValue(plc!, "etage_courant")).toBe(2);

				// Ouverture de la porte (2 s) puis fermeture, retour à l'état initial
				await jest.advanceTimersByTimeAsync(3000);
				if (cycleError) throw cycleError;
				expect(getVariableValue(plc!, "monter")).toBe(false);
				expect(getVariableValue(plc!, "porte")).toBe(false);
				expect(getVariableValue(plc!, "porte_ouverte")).toBe(false);

				// Appel du RDC depuis la cabine
				plc!.setPhysicalInputValueByName("cabine_0", true);
				await jest.advanceTimersByTimeAsync(40);
				plc!.setPhysicalInputValueByName("cabine_0", false);

				await jest.advanceTimersByTimeAsync(1500);
				if (cycleError) throw cycleError;
				expect(getVariableValue(plc!, "position")).toBe(0);
				expect(getVariableValue(plc!, "etage_courant")).toBe(0);
				expect(getVariableValue(plc!, "descendre")).toBe(false);

				plc!.stop();
			});
		});
	});
});
