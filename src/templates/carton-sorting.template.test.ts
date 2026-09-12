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
	createCartonSortingProject,
	createCartonSortingSolution,
} from "./carton-sorting.template";

describe("carton-sorting.template", () => {
	describe("createCartonSortingProject (exercice)", () => {
		let project: Project;

		beforeEach(() => {
			project = createCartonSortingProject();
		});

		it("déclare les entrées, sorties, le compteur et la page HMI", () => {
			const mnemonics = project.variables.map((v) => v.mnemonic);
			expect(mnemonics).toEqual(
				expect.arrayContaining([
					"dcy",
					"dcy_caisse",
					"sel_caisse_haute",
					"Cmd_T1",
					"Cmd_P1_out",
					"Cmd_P3_in",
					"cpt_psce_c",
					"cpt_c_hte",
					"C",
				]),
			);
			expect(Object.values(project.hmiPages)).toHaveLength(1);
		});

		it("fournit le modèle de partie opérative en Ladder, référencé par le Main", () => {
			const operative = Object.values(project.ladders).find(
				(l) => l.name === "Partie opérative",
			);
			expect(operative).toBeDefined();
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

		it("dispose les lignes du modèle sans chevauchement d'empreintes", () => {
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

		it("laisse au moins une colonne vide entre deux éléments d'une ligne (anti-chevauchement des étiquettes)", () => {
			const operative = Object.values(project.ladders).find(
				(l) => l.name === "Partie opérative",
			)!;
			for (const section of operative.sections) {
				const byRow = new Map<number, { col: number; width: number }[]>();
				for (const el of section.elements) {
					if (el.type === "railTerminal") continue;
					const list = byRow.get(el.position.row) ?? [];
					list.push({ col: el.position.col, width: getElementWidth(el) });
					byRow.set(el.position.row, list);
				}
				for (const list of byRow.values()) {
					list.sort((a, b) => a.col - b.col);
					for (let i = 1; i < list.length; i++) {
						const gap = list[i].col - (list[i - 1].col + list[i - 1].width);
						expect(gap).toBeGreaterThanOrEqual(1);
					}
				}
			}
		});

		it("passe l'analyse sans erreur (le modèle seul, sans commande, est valide)", () => {
			const { analysis } = compilePipelineDetailed(project);
			expect(
				analysis.issues.filter((i) => i.severity === "error"),
			).toHaveLength(0);
		});

		describe("anti-blocage : `dcy_caisse` ré-arme toujours un cycle", () => {
			beforeEach(() => jest.useFakeTimers());
			afterEach(() => jest.useRealTimers());

			it("remet `caisse_presente` et `pos_caisse` à zéro même si un cycle précédent a laissé la caisse en place", async () => {
				let cycleError: Error | null = null;
				const plc = compileToPLC(project, 10, Dialect.FR, {
					onCycleError: (e) => (cycleError = e),
				});
				expect(plc).not.toBeNull();
				const idOf = (name: string) =>
					plc!.getVariablesSnapshot().find((v) => v.getName() === name)!.getId();

				plc!.setPhysicalInputValueByName("dcy_caisse", false);
				plc!.start();
				await jest.advanceTimersByTimeAsync(20);

				// 1re caisse
				plc!.setPhysicalInputValueByName("dcy_caisse", true);
				await jest.advanceTimersByTimeAsync(40);
				plc!.setPhysicalInputValueByName("dcy_caisse", false);
				await jest.advanceTimersByTimeAsync(20);

				// Le tapis avance la caisse, mais aucune commande ne mène P1 en butée :
				// `cpt_p1_out` ne vient jamais → `caisse_presente` reste collé (le blocage).
				plc!.forceVariable(idOf("Cmd_T1"), true);
				await jest.advanceTimersByTimeAsync(300);
				// Tapis à l'arrêt (sans commande dans l'exercice, la sortie resterait collée).
				plc!.forceVariable(idOf("Cmd_T1"), false);
				await jest.advanceTimersByTimeAsync(20);
				if (cycleError) throw cycleError;

				expect(getVariableValue(plc!, "caisse_presente")).toBe(true);
				expect(getVariableValue(plc!, "pos_caisse")).toBeGreaterThan(0);

				// Nouvel appui « Nouvelle caisse » : le cycle repart proprement.
				plc!.setPhysicalInputValueByName("dcy_caisse", true);
				await jest.advanceTimersByTimeAsync(40);
				plc!.setPhysicalInputValueByName("dcy_caisse", false);
				await jest.advanceTimersByTimeAsync(20);
				if (cycleError) throw cycleError;

				expect(getVariableValue(plc!, "pos_caisse")).toBe(0);
				expect(getVariableValue(plc!, "caisse_presente")).toBe(true);

				plc!.stop();
			});
		});
	});

	describe("createCartonSortingSolution (correction)", () => {
		let project: Project;

		beforeEach(() => {
			project = createCartonSortingSolution();
		});

		it("tient dans une page A4 portrait (≈ 794 × 1123 px)", () => {
			const grafcet = Object.values(project.grafcets)[0];
			const elements = grafcet.getAllElements();
			const right = Math.max(
				...elements.map((e) => e.position.x + e.size.width),
			);
			const bottom = Math.max(
				...elements.map((e) => e.position.y + e.size.height),
			);
			expect(right).toBeLessThanOrEqual(794);
			expect(bottom).toBeLessThanOrEqual(1123);
		});

		it("la caisse triée finit centrée dans son cadre de sortie", () => {
			const page = Object.values(project.hmiPages)[0];
			const widgets = Object.values(page.widgets);
			const caisse = widgets.find((w) => w.name === "Caisse")!;
			const center = (name: string) => {
				const w = widgets.find((x) => x.name === name)!;
				return {
					x: w.position.x + w.size.width / 2,
					y: w.position.y + w.size.height / 2,
				};
			};
			// Déplacements finaux imposés par le modèle de partie opérative (constantes px).
			const dx = 516 + 120; // T1_MAX + CAISSE_X_MAX
			const basse = {
				x: caisse.position.x + dx + caisse.size.width / 2,
				y: caisse.position.y + 192 + caisse.size.height / 2, // CYL_MAX
			};
			const haute = {
				x: caisse.position.x + dx + caisse.size.width / 2,
				y: caisse.position.y + 276 + caisse.size.height / 2, // CAISSE_Y_P3
			};
			expect(basse).toEqual(center("Sortie caisses basses"));
			expect(haute).toEqual(center("Sortie caisses hautes"));
		});

		it("passe le pipeline complet sans erreur d'analyse ni de compilation", () => {
			const { analysis, preCompilation, compilation } =
				compilePipelineDetailed(project);
			expect(
				analysis.issues.filter((i) => i.severity === "error"),
			).toHaveLength(0);
			expect(preCompilation.errors).toHaveLength(0);
			expect(compilation.errors).toHaveLength(0);
			expect(compilation.result).toBeDefined();
		});

		describe("simulation", () => {
			// La cinématique cadencée sur `_SYS_TB_200ms` demande ~40 s de temps simulé pour un
			// cycle complet ; à 10 ms de scan ça fait beaucoup d'itérations de timers factices,
			// lentes sous charge parallèle — d'où la marge sur le délai.
			jest.setTimeout(30000);
			beforeEach(() => jest.useFakeTimers());
			afterEach(() => jest.useRealTimers());

			/** Lance le poste (appui `dcy`) et laisse la partie opérative se stabiliser. */
			const startMachine = () => {
				let cycleError: Error | null = null;
				const plc = compileToPLC(project, 10, Dialect.FR, {
					onCycleError: (e) => (cycleError = e),
				});
				expect(plc).not.toBeNull();
				plc!.setPhysicalInputValueByName("dcy", false);
				plc!.setPhysicalInputValueByName("dcy_caisse", false);
				plc!.setPhysicalInputValueByName("sel_caisse_haute", false);
				plc!.start();
				return { plc: plc!, getError: () => cycleError };
			};

			const pulse = async (plc: ReturnType<typeof startMachine>["plc"], name: string) => {
				plc.setPhysicalInputValueByName(name, true);
				await jest.advanceTimersByTimeAsync(40);
				plc.setPhysicalInputValueByName(name, false);
				await jest.advanceTimersByTimeAsync(20);
			};

			it("trie une caisse basse par P1 puis P2 et incrémente le compteur", async () => {
				const { plc, getError } = startMachine();
				await jest.advanceTimersByTimeAsync(50);

				await pulse(plc, "dcy"); // départ cycle -> X1
				plc.setPhysicalInputValueByName("sel_caisse_haute", false);
				await pulse(plc, "dcy_caisse"); // nouvelle caisse basse

				// Convoyage + poussées P1 puis P2 (large marge)
				await jest.advanceTimersByTimeAsync(45000);
				if (getError()) throw getError();

				expect(getVariableValue(plc, "C")).toBe(1);
				expect(getVariableValue(plc, "cpt_p2_in")).toBe(true);
				expect(getVariableValue(plc, "Cmd_T1")).toBe(true); // en attente de la caisse suivante
				// La caisse s'arrête pile sur sa cible (pas de dépassement d'un pas).
				expect(getVariableValue(plc, "caisse_y")).toBe(192);
				expect(getVariableValue(plc, "caisse_dx")).toBe(636);

				plc.stop();
			});

			it("trie une caisse haute par P1 puis P3", async () => {
				const { plc, getError } = startMachine();
				await jest.advanceTimersByTimeAsync(50);

				await pulse(plc, "dcy");
				plc.setPhysicalInputValueByName("sel_caisse_haute", true);
				await pulse(plc, "dcy_caisse");

				await jest.advanceTimersByTimeAsync(45000);
				if (getError()) throw getError();

				expect(getVariableValue(plc, "C")).toBe(1);
				expect(getVariableValue(plc, "cpt_p3_in")).toBe(true);
				expect(getVariableValue(plc, "pos_p3")).toBe(0);
				expect(getVariableValue(plc, "caisse_y")).toBe(276);
				expect(getVariableValue(plc, "caisse_dx")).toBe(636);

				plc.stop();
			});

			it("avance la cinématique sur une base de temps, pas sur le scan", async () => {
				// Même temps simulé, deux temps de scan différents : la caisse doit être à la
				// même position (les mouvements sont cadencés par `_SYS_TB_200ms`).
				const advanceOnScan = async (scanTimeMs: number) => {
					const plc = compileToPLC(project, scanTimeMs, Dialect.FR)!;
					plc.setPhysicalInputValueByName("dcy", true);
					plc.setPhysicalInputValueByName("dcy_caisse", true);
					plc.setPhysicalInputValueByName("sel_caisse_haute", false);
					plc.start();
					await jest.advanceTimersByTimeAsync(4000);
					const posCaisse = getVariableValue(plc, "pos_caisse");
					plc.stop();
					return posCaisse;
				};

				const posAt10 = await advanceOnScan(10);
				const posAt50 = await advanceOnScan(50);

				expect(posAt10).toBeGreaterThan(0);
				expect(posAt50).toBe(posAt10);
			});

			it("réinitialise le cycle complet après deux caisses", async () => {
				const { plc, getError } = startMachine();
				await jest.advanceTimersByTimeAsync(50);

				await pulse(plc, "dcy");
				plc.setPhysicalInputValueByName("sel_caisse_haute", false);
				await pulse(plc, "dcy_caisse");
				await jest.advanceTimersByTimeAsync(45000);

				await pulse(plc, "dcy_caisse"); // 2e caisse
				await jest.advanceTimersByTimeAsync(45000);
				if (getError()) throw getError();

				// X6 -> renvoi vers X0 : compteur remis à zéro, tapis T2/T3 relâché
				expect(getVariableValue(plc, "C")).toBe(0);
				expect(getVariableValue(plc, "Cmd_T2T3")).toBe(false);

				plc.stop();
			});
		});
	});
});
