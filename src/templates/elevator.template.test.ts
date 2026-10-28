import { getSceneDescriptor } from "@/3d-scenes/scene.registry";
import {
	getElementHeight,
	getElementWidth,
} from "@/schemas/ladder/element.schema";
import Project from "@/schemas/project/project.schema";
import { compilePipelineDetailed } from "@tests/utils/test-helpers";
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

		it("déclare les appels palier, les appels cabine, les sorties, les capteurs et les mémoires", () => {
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
					"etage_0",
					"etage_1",
					"etage_2",
					"porte_ouverte",
					"etage_courant",
				]),
			);
		});

		it("fournit le Ladder d'affichage, référencé par le Main", () => {
			const display = Object.values(project.ladders).find(
				(l) => l.name === "Affichage",
			);
			expect(display).toBeDefined();
			expect(display!.sections.map((s) => s.title)).toEqual(["Affichage"]);
			for (const section of display!.sections) {
				expect(section.description).not.toBe("");
			}
			const mainCallsIt = project.main.sections
				.flatMap((s) => s.elements)
				.some(
					(e) =>
						e.type === "block" &&
						e.data.blockType === "user-program" &&
						e.data.params.programId === display!.id,
				);
			expect(mainCallsIt).toBe(true);
		});

		it("ne simule plus la partie opérative en Ladder : la scène 3D s'en charge", () => {
			expect(
				Object.values(project.ladders).some(
					(l) => l.name === "Partie opérative",
				),
			).toBe(false);
			const mnemonics = project.variables.map((v) => v.mnemonic);
			expect(mnemonics).not.toContain("porte_pos");
			expect(mnemonics).not.toContain("porte_maintien");
		});

		it("dispose les lignes du modèle sans chevauchement d'empreintes (blocs Calc/Assign sur 2 cellules)", () => {
			const display = Object.values(project.ladders).find(
				(l) => l.name === "Affichage",
			)!;
			for (const section of display.sections) {
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

		it("ne donne aucun comportement aux entrées, pilotées par la scène 3D", () => {
			const behaviorKinds = Object.fromEntries(
				project.variables
					.filter((v) => v.zone === "logic-input")
					.map((v) => [v.mnemonic, v.behavior?.kind ?? null]),
			);
			expect(behaviorKinds).toEqual({
				appel_0: null,
				appel_1: null,
				appel_2: null,
				cabine_0: null,
				cabine_1: null,
				cabine_2: null,
				etage_0: null,
				etage_1: null,
				etage_2: null,
				porte_ouverte: null,
			});
		});

		it("déclare la hauteur de la cabine en entrée analogique entière", () => {
			const position = project.variables.find((v) => v.mnemonic === "position");
			expect(position?.zone).toBe("analog-input");
			expect(position?.type).toBe("INT");
		});

		it("câble chaque point de la scène 3D sur une variable existante de la bonne zone", () => {
			const scene = project.scene3d!;
			const descriptor = getSceneDescriptor(scene.sceneId, scene.sceneVersion)!;
			expect(scene.sceneId).toBe("elevator");
			expect(Object.keys(scene.bindings).sort()).toEqual(
				descriptor.points.map((p) => p.id).sort(),
			);
			const sensorZones = ["logic-input", "analog-input"];
			for (const point of descriptor.points) {
				const variable = project.variables.find(
					(v) => v.id === scene.bindings[point.id],
				);
				expect(variable?.mnemonic).toBe(point.suggestedMnemonic);
				if (point.kind === "sensor") {
					expect(sensorZones).toContain(variable?.zone);
				} else if (point.kind === "display") {
					expect(variable?.zone).toBe("memory");
				} else {
					expect(variable?.zone).toBe("logic-output");
				}
			}
		});

		it("n'a pas de page HMI : boutons et voyants sont dans la scène 3D", () => {
			expect(Object.values(project.hmiPages)).toHaveLength(0);
		});

		it("passe l'analyse sans erreur ni avertissement de câblage de la scène (sans commande)", () => {
			const { analysis } = compilePipelineDetailed(project);
			const errors = analysis.issues.filter((i) => i.severity === "error");
			expect(errors).toHaveLength(0);
			expect(
				analysis.issues.filter((i) => i.code.startsWith("SCENE3D_")),
			).toHaveLength(0);
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

		it("conserve les variables et le modèle de l'exercice", () => {
			const mnemonics = project.variables.map((v) => v.mnemonic);
			expect(mnemonics).toEqual(
				expect.arrayContaining(["appel_2", "cabine_0", "position", "cible"]),
			);
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
	});

	describe("langue", () => {
		it("garde les noms français par défaut et en fr", () => {
			for (const project of [
				createElevatorSolution(),
				createElevatorSolution("fr"),
			]) {
				expect(project.name).toBe("Ascenseur — solution");
				expect(Object.values(project.grafcets).map((g) => g.name)).toEqual([
					"Commande",
				]);
				expect(Object.values(project.ladders).map((l) => l.name)).toContain(
					"Affichage",
				);
			}
		});

		it("nomme projet, programmes et sections en anglais, sans accent", () => {
			const project = createElevatorSolution("en");
			const ladders = Object.values(project.ladders);
			const names = [
				project.name,
				...Object.values(project.grafcets).map((g) => g.name),
				...ladders.map((l) => l.name),
				...ladders.flatMap((l) => l.sections.map((s) => s.title)),
				...ladders.flatMap((l) => l.sections.map((s) => s.description)),
			];
			expect(project.name).toBe("Elevator: solution");
			expect(ladders.map((l) => l.name)).toContain("Display");
			expect(names.join("")).not.toMatch(/[À-ÿ]/);
		});
	});
});
