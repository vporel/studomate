import Project from "@/schemas/project/project.schema";
import { Dialect } from "@/expression-language/dialect.enum";
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
					"barriere",
					"complet",
					"places",
				]),
			);
		});

		it("contient une page HMI avec les boutons et l'affichage du compteur", () => {
			const pages = Object.values(project.hmiPages);
			expect(pages).toHaveLength(1);
			const types = Object.values(pages[0].widgets).map((w) => w.type);
			expect(types).toEqual(
				expect.arrayContaining([
					"push-button",
					"numeric-display",
					"gauge",
					"indicator",
				]),
			);
		});

		it("anime les 4 emplacements sur `places` (occupé dès que places >= n)", () => {
			const page = Object.values(project.hmiPages)[0];
			const emplacements = Object.values(page.widgets)
				.filter((w) => w.name.startsWith("Emplacement "))
				.sort((a, b) => a.name.localeCompare(b.name));
			expect(emplacements).toHaveLength(4);
			emplacements.forEach((w, i) => {
				const rows = w.data.animations?.style?.rows ?? [];
				expect(w.data.animations?.style?.variable).toBe("places");
				expect(rows.map((r) => r.value)).toEqual(
					Array.from({ length: 4 - i }, (_, k) => i + 1 + k),
				);
			});
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

		it("conserve les variables et la page HMI de l'exercice", () => {
			const mnemonics = project.variables.map((v) => v.mnemonic);
			expect(mnemonics).toEqual(
				expect.arrayContaining(["places", "barriere", "complet"]),
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

		it("reboucle sur l'étape 0 par des renvois d'étape (=0), sans connexion de retour", () => {
			const commande = Object.values(project.grafcets).find(
				(g) => g.name === "Commande",
			)!;
			const renvois = Object.values(commande.stepsReferralsSources);
			expect(renvois).toHaveLength(2);
			expect(renvois.every((r) => r.data.targetStepNumber === 0)).toBe(true);
			// L'étape 0 est rejointe uniquement par renvoi : aucune connexion ne la cible.
			const e0 = Object.values(commande.steps).find((s) => s.data.number === 0)!;
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
			const maxX = Math.max(...elements.map((e) => e.position.x + e.size.width));
			// A4 portrait ≈ 210 mm ≈ 794 px à 96 dpi
			expect(maxX - minX).toBeLessThan(794);
		});

		it("produit des routines exécutables (2 grafcets + Main + observation)", () => {
			const { compilation } = compilePipelineDetailed(project);
			expect(compilation.result!.routines).toHaveLength(4);
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
