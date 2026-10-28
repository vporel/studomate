import PlcScenario from "@tests/utils/plc-scenario";
import { compilePipelineDetailed } from "@tests/utils/test-helpers";
import {
	RAW_MAX,
	createLadderScalingProject,
	createLadderScalingSolution,
} from "./ladder-scaling.template";
import {
	arithmetic,
	assign,
	convert,
	section,
	setMainSections,
} from "@/templates/training/utils/ladder-dsl";
import { memory } from "@/templates/training/utils/training-variables";

describe("ladder-scaling.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it.each([
		[0, 0],
		[RAW_MAX / 2, 50],
		[RAW_MAX, 100],
	])("brut=%s donne niveau=%s", async (brut, niveau) => {
		const scenario = new PlcScenario(createLadderScalingSolution());
		scenario.set("brut", brut);
		await scenario.cycles(3);
		expect(scenario.get("niveau")).toBe(niveau);
		scenario.stop();
	});

	it("la cuve fonctionne sur brut", async () => {
		const scenario = new PlcScenario(createLadderScalingSolution());
		scenario.set("brut", 0);
		await scenario.cycles(3);
		expect(scenario.get("pompe")).toBe(true);
		scenario.set("brut", RAW_MAX);
		await scenario.cycles(3);
		expect(scenario.get("pompe")).toBe(false);
		scenario.stop();
	});

	it("l'énoncé ne calcule pas niveau", async () => {
		const scenario = new PlcScenario(createLadderScalingProject());
		scenario.set("brut", RAW_MAX);
		await scenario.cycles(3);
		expect(scenario.get("niveau")).toBe(0);
		scenario.stop();
	});

	it("brut * 100 reboucle en INT, brut / 27648 * 100 tronque à 0", async () => {
		const overflow = createLadderScalingProject();
		overflow.variables.push(memory("intermediaire", "INT"));
		setMainSections(overflow, [
			section("Copie", "", assign("intermediaire", "brut")),
			section(
				"Produit",
				"",
				arithmetic("intermediaire", "intermediaire", "*", "100"),
			),
		]);
		const overflowScenario = new PlcScenario(overflow);
		overflowScenario.set("brut", RAW_MAX);
		await overflowScenario.cycles(3);
		expect(overflowScenario.get("intermediaire") as number).not.toBe(
			RAW_MAX * 100,
		);
		overflowScenario.stop();

		const truncation = createLadderScalingProject();
		truncation.variables.push(memory("intermediaire", "INT"));
		setMainSections(truncation, [
			section("Copie", "", assign("intermediaire", "brut")),
			section(
				"Division",
				"",
				arithmetic("intermediaire", "intermediaire", "/", `${RAW_MAX}`),
			),
			section(
				"Produit",
				"",
				arithmetic("intermediaire", "intermediaire", "*", "100"),
			),
		]);
		const truncationScenario = new PlcScenario(truncation);
		truncationScenario.set("brut", RAW_MAX / 2);
		await truncationScenario.cycles(3);
		expect(truncationScenario.get("intermediaire")).toBe(0);
		truncationScenario.stop();
	});

	it.each([
		[0, 0, 0],
		[RAW_MAX / 2, 6144, 0],
		[RAW_MAX, 12288, 0],
	])(
		"multiplier d'abord en INT : brut=%s donne calcul_int=%s puis niveau=%s",
		async (brut, produit, niveau) => {
			const product = createLadderScalingProject();
			setMainSections(product, [
				section("Produit", "", arithmetic("calcul_int", "brut", "*", "100")),
			]);
			const productScenario = new PlcScenario(product);
			productScenario.set("brut", brut);
			await productScenario.cycles(3);
			expect(productScenario.get("calcul_int")).toBe(produit);
			productScenario.stop();

			const full = createLadderScalingProject();
			setMainSections(full, [
				section("Produit", "", arithmetic("calcul_int", "brut", "*", "100")),
				section(
					"Division",
					"",
					arithmetic("calcul_int", "calcul_int", "/", `${RAW_MAX}`),
				),
				section("Niveau", "", assign("niveau", "calcul_int")),
			]);
			const fullScenario = new PlcScenario(full);
			fullScenario.set("brut", brut);
			await fullScenario.cycles(3);
			expect(fullScenario.get("niveau")).toBe(niveau);
			fullScenario.stop();
		},
	);

	it.each([
		[0, 0],
		[RAW_MAX / 2, 0],
		[RAW_MAX, 100],
	])(
		"diviser d'abord en INT : brut=%s donne niveau=%s",
		async (brut, niveau) => {
			const project = createLadderScalingProject();
			setMainSections(project, [
				section(
					"Division",
					"",
					arithmetic("calcul_int", "brut", "/", `${RAW_MAX}`),
				),
				section(
					"Produit",
					"",
					arithmetic("calcul_int", "calcul_int", "*", "100"),
				),
				section("Niveau", "", assign("niveau", "calcul_int")),
			]);
			const scenario = new PlcScenario(project);
			scenario.set("brut", brut);
			await scenario.cycles(3);
			expect(scenario.get("niveau")).toBe(niveau);
			scenario.stop();
		},
	);

	it("INT * INT reboucle avant l'affectation, même vers un DINT (1000 * 100 donne -31072)", async () => {
		const project = createLadderScalingProject();
		setMainSections(project, [
			section("Produit", "", arithmetic("calcul_dint", "brut", "*", "100")),
		]);
		const scenario = new PlcScenario(project);
		scenario.set("brut", 1000);
		await scenario.cycles(3);
		expect(scenario.get("calcul_dint")).toBe(-31072);
		scenario.stop();
	});

	it("une division entre entiers tronque : 7 / 2 donne 3, 9 / 2 donne 4", async () => {
		for (const [numerator, expected] of [
			[7, 3],
			[9, 4],
		]) {
			const project = createLadderScalingProject();
			setMainSections(project, [
				section("Division", "", arithmetic("calcul_int", "brut", "/", "2")),
			]);
			const scenario = new PlcScenario(project);
			scenario.set("brut", numerator);
			await scenario.cycles(3);
			expect(scenario.get("calcul_int")).toBe(expected);
			scenario.stop();
		}
	});

	it("la variante DINT + DINT_TO_INT passe l'analyse et donne la même échelle", async () => {
		const project = createLadderScalingProject();
		setMainSections(project, [
			section("Copie", "", assign("calcul_dint", "brut")),
			section(
				"Produit",
				"",
				arithmetic("calcul_dint", "calcul_dint", "*", "100"),
			),
			section(
				"Division",
				"",
				arithmetic("calcul_dint", "calcul_dint", "/", `${RAW_MAX}`),
			),
			section(
				"Retour en INT",
				"",
				convert("niveau", "calcul_dint", "DINT", "INT"),
			),
		]);
		const { analysis } = compilePipelineDetailed(project);
		expect(analysis.issues.filter((i) => i.severity === "error")).toHaveLength(
			0,
		);
		const scenario = new PlcScenario(project);
		scenario.set("brut", RAW_MAX / 2);
		await scenario.cycles(3);
		expect(scenario.get("niveau")).toBe(50);
		scenario.stop();
	});
});
