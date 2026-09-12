import { Dialect } from "@/expression-language/dialect.enum";
import {
	getElementHeight,
	getElementWidth,
} from "@/schemas/ladder/element.schema";
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
			expect(operative!.sections.map((s) => s.title)).toEqual([
				"Cinématique",
				"Capteurs",
				"Affichage",
			]);
			for (const section of operative!.sections) {
				expect(section.description).not.toBe("");
			}
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

		it("dispose les lignes du modèle sans chevauchement d'empreintes (blocs Calc/Assign sur 2 cellules)", () => {
			const operative = Object.values(project.ladders).find(
				(l) => l.name === "Partie opérative",
			)!;
			for (const section of operative.sections) {
				const footprints = section.elements.map((el) => ({
					row: el.position.row,
					col: el.position.col,
					width: getElementWidth(el),
					height: getElementHeight(el),
				}));
				for (let i = 0; i < footprints.length; i++) {
					for (let j = i + 1; j < footprints.length; j++) {
						const a = footprints[i];
						const b = footprints[j];
						const overlap =
							a.col < b.col + b.width &&
							b.col < a.col + a.width &&
							a.row < b.row + b.height &&
							b.row < a.row + a.height;
						expect(overlap).toBe(false);
					}
				}
			}
		});

		it("passe l'analyse sans erreur (le modèle seul, sans commande, est valide)", () => {
			const { analysis } = compilePipelineDetailed(project);
			const errors = analysis.issues.filter((i) => i.severity === "error");
			expect(errors).toHaveLength(0);
		});

		it("ne fournit pas de GRAFCET de commande", () => {
			expect(Object.values(project.grafcets)).toHaveLength(0);
		});

		describe("temps de garde porte ouverte", () => {
			beforeEach(() => jest.useFakeTimers());
			afterEach(() => jest.useRealTimers());

			it("maintient la porte ouverte ~2 s après la retombée de la commande, puis la laisse se refermer", async () => {
				let cycleError: Error | null = null;
				const plc = compileToPLC(project, 10, Dialect.FR, {
					onCycleError: (e) => (cycleError = e),
				})!;
				const porteId = plc
					.getVariablesSnapshot()
					.find((v) => v.getName() === "porte")!
					.getId();

				plc.start();
				await jest.advanceTimersByTimeAsync(50);

				// Ouverture commandée jusqu'à la position ouverte
				plc.setOutputImageValueById(porteId, true);
				await jest.advanceTimersByTimeAsync(1500);
				if (cycleError) throw cycleError;
				expect(getVariableValue(plc, "porte_pos")).toBe(100);
				expect(getVariableValue(plc, "porte_ouverte")).toBe(true);

				// Commande retombée avant l'écoulement du temps de garde : la porte reste ouverte
				plc.setOutputImageValueById(porteId, false);
				await jest.advanceTimersByTimeAsync(1000);
				if (cycleError) throw cycleError;
				expect(getVariableValue(plc, "porte_pos")).toBe(100);
				expect(getVariableValue(plc, "porte_ouverte")).toBe(true);
				expect(getVariableValue(plc, "porte_maintien")).toBe(false);

				// Temps de garde écoulé : le verrou tombe et la porte se referme
				await jest.advanceTimersByTimeAsync(1200);
				if (cycleError) throw cycleError;
				expect(getVariableValue(plc, "porte_ouverte")).toBe(false);
				expect(getVariableValue(plc, "porte_pos")).toBeLessThan(100);

				await jest.advanceTimersByTimeAsync(1500);
				if (cycleError) throw cycleError;
				expect(getVariableValue(plc, "porte_pos")).toBe(0);
				expect(getVariableValue(plc, "porte_maintien")).toBe(false);

				plc.stop();
			});
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

		it("reboucle l'étape 8 vers l'étape 0 par un renvoi d'étape (tenant + aboutissant)", () => {
			const grafcet = Object.values(project.grafcets)[0];
			const sources = Object.values(grafcet.stepsReferralsSources);
			const targets = Object.values(grafcet.stepsReferralsTargets);
			expect(sources).toHaveLength(1);
			expect(targets).toHaveLength(1);
			expect(sources[0].data.targetStepNumber).toBe(0);
			expect(targets[0].data.sourceStepNumber).toBe(8);
		});

		it("garde tous les éléments du GRAFCET dans les limites d'une page A4 portrait", () => {
			// A4 portrait à 96 DPI : ~794 × ~1123 px.
			const PAGE_W = 794;
			const PAGE_H = 1123;
			const grafcet = Object.values(project.grafcets)[0];
			const elements = [
				...Object.values(grafcet.steps),
				...Object.values(grafcet.transitions),
				...Object.values(grafcet.actions),
				...Object.values(grafcet.junctionsOrStarts),
				...Object.values(grafcet.junctionsOrEnds),
				...Object.values(grafcet.stepsReferralsSources),
				...Object.values(grafcet.stepsReferralsTargets),
			];
			for (const el of elements) {
				expect(el.position.x).toBeGreaterThanOrEqual(0);
				expect(el.position.y).toBeGreaterThanOrEqual(0);
				expect(el.position.x + el.size.width).toBeLessThanOrEqual(PAGE_W);
				expect(el.position.y + el.size.height).toBeLessThanOrEqual(PAGE_H);
			}
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
