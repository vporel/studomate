import Project from "@/schemas/project/project.schema";
import { Dialect } from "@/expression-language/dialect.enum";
import { getSceneDescriptor } from "@/3d-scenes/scene.registry";
import {
	createParkingProject,
	createParkingSolution,
} from "./parking.template";
import {
	compilePipelineDetailed,
	compileToPLC,
	getVariableValue,
} from "@tests/utils/test-helpers";

describe("parking.template", () => {
	describe("createParkingProject (exercice)", () => {
		let project: Project;

		beforeEach(() => {
			project = createParkingProject();
		});

		it("produit un projet valide", () => {
			expect(project).toBeInstanceOf(Project);
			expect(project.id).toBeTruthy();
		});

		it("déclare les entrées, sorties et le compteur attendus", () => {
			const mnemonics = project.variables.map((v) => v.mnemonic);
			expect(mnemonics).toEqual(
				expect.arrayContaining([
					"dem_entree",
					"dem_sortie",
					"passage",
					"barriere_entree",
					"barriere_sortie",
					"complet",
					"places",
				]),
			);
		});

		it("n'a plus de page HMI : le pupitre est dans la scène 3D", () => {
			expect(Object.values(project.hmiPages)).toHaveLength(0);
		});

		it("câble la scène 3D Parking sur les variables du projet", () => {
			expect(project.scene3d?.sceneId).toBe("parking");
			const bindings = project.scene3d!.bindings;
			const mnemonicOf = (pointId: string) =>
				project.variables.find((v) => v.id === bindings[pointId])?.mnemonic;
			expect(mnemonicOf("entryDetector")).toBe("dem_entree");
			expect(mnemonicOf("exitDetector")).toBe("dem_sortie");
			expect(mnemonicOf("photocell")).toBe("passage");
			expect(mnemonicOf("barrierEntry")).toBe("barriere_entree");
			expect(mnemonicOf("barrierExit")).toBe("barriere_sortie");
			expect(mnemonicOf("full")).toBe("complet");
			expect(mnemonicOf("places")).toBe("places");
		});

		it("lie chaque point de la scène à une variable de la bonne zone", () => {
			const zones = {
				sensor: "logic-input",
				actuator: "logic-output",
				display: "memory",
			};
			for (const point of getSceneDescriptor("parking", 1)!.points) {
				const variable = project.variables.find(
					(v) => v.id === project.scene3d!.bindings[point.id],
				)!;
				expect(variable.zone).toBe(zones[point.kind]);
			}
		});

		it("passe l'analyse sans erreur (projet sans programme est valide)", () => {
			const { analysis } = compilePipelineDetailed(project);
			const errors = analysis.issues.filter((i) => i.severity === "error");
			expect(errors).toHaveLength(0);
		});
	});

	describe("createParkingSolution (correction)", () => {
		let project: Project;

		beforeEach(() => {
			project = createParkingSolution();
		});

		it("conserve les variables et la scène 3D de l'exercice", () => {
			const mnemonics = project.variables.map((v) => v.mnemonic);
			expect(mnemonics).toEqual(
				expect.arrayContaining([
					"places",
					"barriere_entree",
					"barriere_sortie",
					"complet",
				]),
			);
			expect(project.scene3d?.sceneId).toBe("parking");
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

		it("reboucle sur l'étape 0 par des renvois d'étape (=0), sans connexion de retour", () => {
			const commande = Object.values(project.grafcets).find(
				(g) => g.name === "Commande",
			)!;
			const renvois = Object.values(commande.stepsReferralsSources);
			expect(renvois).toHaveLength(2);
			expect(renvois.every((r) => r.data.targetStepNumber === 0)).toBe(true);
			// L'étape 0 est rejointe uniquement par renvoi : aucune connexion ne la cible.
			const e0 = Object.values(commande.steps).find(
				(s) => s.data.number === 0,
			)!;
			const versE0 = Object.values(commande.connections).filter(
				(c) => c.target.id === e0.id,
			);
			expect(versE0).toHaveLength(0);
		});

		it("tient dans la largeur d'une page A4 portrait", () => {
			const commande = Object.values(project.grafcets).find(
				(g) => g.name === "Commande",
			)!;
			const elements = [
				...Object.values(commande.steps),
				...Object.values(commande.transitions),
				...Object.values(commande.actions),
				...Object.values(commande.junctionsOrStarts),
				...Object.values(commande.stepsReferralsSources),
			];
			const minX = Math.min(...elements.map((e) => e.position.x));
			const maxX = Math.max(
				...elements.map((e) => e.position.x + e.size.width),
			);
			// A4 portrait ≈ 210 mm ≈ 794 px à 96 dpi
			expect(maxX - minX).toBeLessThan(794);
			// Le cadre de page de l'éditeur part de x = 0 : rien ne doit le dépasser.
			expect(maxX).toBeLessThanOrEqual(794);
		});

		it("produit des routines exécutables (2 grafcets + sorties + mémos + init + Main + observation)", () => {
			const { compilation } = compilePipelineDetailed(project);
			// 2 grafcets + sorties en niveau + mémos d'étape + initialisation + 1 Main + observation des réceptivités
			expect(compilation.result!.routines).toHaveLength(7);
		});

		describe("simulation", () => {
			beforeEach(() => jest.useFakeTimers());
			afterEach(() => jest.useRealTimers());

			const pulse = async (
				plc: NonNullable<ReturnType<typeof compileToPLC>>,
				name: string,
			) => {
				plc.setPhysicalInputValueByName(name, true);
				await jest.advanceTimersByTimeAsync(60);
				plc.setPhysicalInputValueByName(name, false);
				await jest.advanceTimersByTimeAsync(60);
			};

			it("compte les entrées et sorties, et allume `complet` à la capacité", async () => {
				let cycleError: Error | null = null;
				const plc = compileToPLC(project, 10, Dialect.FR, {
					onCycleError: (e) => (cycleError = e),
				});
				expect(plc).not.toBeNull();

				plc!.setPhysicalInputValueByName("dem_entree", false);
				plc!.setPhysicalInputValueByName("dem_sortie", false);
				plc!.setPhysicalInputValueByName("passage", false);
				plc!.start();
				await jest.advanceTimersByTimeAsync(50);

				// 4 entrées → parking plein
				for (let i = 0; i < 4; i++) {
					await pulse(plc!, "dem_entree");
					await pulse(plc!, "passage");
				}
				if (cycleError) throw cycleError;
				expect(getVariableValue(plc!, "places")).toBe(4);
				expect(getVariableValue(plc!, "complet")).toBe(true);

				// Une entrée de plus est refusée (places < 4 faux)
				await pulse(plc!, "dem_entree");
				expect(getVariableValue(plc!, "places")).toBe(4);

				// Une sortie → décrémente, `complet` s'éteint
				await pulse(plc!, "dem_sortie");
				await pulse(plc!, "passage");
				if (cycleError) throw cycleError;
				expect(getVariableValue(plc!, "places")).toBe(3);
				expect(getVariableValue(plc!, "complet")).toBe(false);

				plc!.stop();
			});
		});
	});
});
