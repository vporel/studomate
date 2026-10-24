import PlcScenario from "@tests/utils/plc-scenario";
import Project from "@/schemas/project/project.schema";
import { compilePipelineDetailed } from "@tests/utils/test-helpers";
import { no, setMainSections } from "@/templates/training/utils/ladder-dsl";
import { input, output } from "@/templates/training/utils/training-variables";
import {
	GrafcetLadderSpec,
	grafcetInitMemory,
	grafcetMemories,
	grafcetSections,
	grafcetThreeBlockMemories,
	grafcetThreeBlockSections,
} from "@/templates/training/utils/grafcet-ladder";

const spec: GrafcetLadderSpec = {
	steps: ["M0", "M1", "M2"],
	initial: ["M0"],
	transitions: [
		{ from: ["M0"], to: ["M1"], receptivity: [no("a")] },
		{ from: ["M1"], to: ["M2"], receptivity: [] },
		{ from: ["M2"], to: ["M0"], receptivity: [no("b")] },
	],
	resetCondition: [no("stop")],
};

function build(): Project {
	const project = new Project("p", "test", "");
	project.variables.push(
		input("a"),
		input("b"),
		input("stop"),
		output("q"),
		...grafcetMemories(spec),
	);
	setMainSections(
		project,
		grafcetSections(spec, [{ variable: "q", steps: ["M1", "M2"] }]),
	);
	return project;
}

describe("grafcet-ladder", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("génère des sections sans erreur d'analyse", () => {
		const { analysis } = compilePipelineDetailed(build());
		expect(analysis.issues.filter((i) => i.severity === "error")).toHaveLength(
			0,
		);
	});

	it("déclare une mémoire par étape, plus l'initialisation, sans mémoire de transition", () => {
		expect(grafcetMemories(spec).map((v) => v.mnemonic)).toEqual([
			"M0",
			"M1",
			"M2",
			"init",
		]);
	});

	it("expose la mémoire d'initialisation seule, avec son nom par défaut ou personnalisé", () => {
		expect(grafcetInitMemory(spec).mnemonic).toBe("init");
		expect(grafcetInitMemory({ ...spec, initMemory: "init_x" }).mnemonic).toBe(
			"init_x",
		);
	});

	it("active l'étape initiale au premier cycle puis franchit les transitions dans l'ordre des réseaux", async () => {
		const scenario = new PlcScenario(build());
		await scenario.cycles();
		expect(scenario.get("M0")).toBe(true);
		scenario.set("a", true);
		await scenario.cycles();
		expect(scenario.get("M0")).toBe(false);
		expect(scenario.get("M1")).toBe(false);
		expect(scenario.get("M2")).toBe(true);
		scenario.stop();
	});

	it("un réseau par transition, nommé d'après ses étapes amont et aval", () => {
		const titles = grafcetSections(spec).map((section) => section.title);
		expect(titles).toEqual(
			expect.arrayContaining(["M0 -> M1", "M1 -> M2", "M2 -> M0"]),
		);
	});

	it("la réinitialisation prime sur l'évolution normale", async () => {
		const scenario = new PlcScenario(build());
		scenario.set("a", true);
		await scenario.cycles(2);
		scenario.set("stop", true);
		await scenario.cycles(2);
		expect(scenario.get("M0")).toBe(true);
		expect(scenario.get("M1")).toBe(false);
		expect(scenario.get("M2")).toBe(false);
		scenario.stop();
	});
});

describe("grafcet-ladder : méthode en trois blocs", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	function buildThreeBlocks(): Project {
		const project = new Project("p", "test", "");
		project.variables.push(
			input("a"),
			input("b"),
			input("stop"),
			output("q"),
			...grafcetThreeBlockMemories(spec),
		);
		setMainSections(
			project,
			grafcetThreeBlockSections(spec, [{ variable: "q", steps: ["M1"] }]),
		);
		return project;
	}

	it("déclare une mémoire par étape et par transition, plus l'initialisation", () => {
		expect(grafcetThreeBlockMemories(spec).map((v) => v.mnemonic)).toEqual([
			"M0",
			"M1",
			"M2",
			"T0",
			"T1",
			"T2",
			"init",
		]);
	});

	it("génère des sections sans erreur d'analyse", () => {
		const { analysis } = compilePipelineDetailed(buildThreeBlocks());
		expect(analysis.issues.filter((i) => i.severity === "error")).toHaveLength(
			0,
		);
	});

	it("franchit au plus une transition par cycle, là où un réseau par transition les enchaîne", async () => {
		const threeBlocks = new PlcScenario(buildThreeBlocks());
		await threeBlocks.cycles();
		threeBlocks.set("a", true);
		await threeBlocks.cycles();
		expect(threeBlocks.get("M1")).toBe(true);
		expect(threeBlocks.get("M2")).toBe(false);
		await threeBlocks.cycles();
		expect(threeBlocks.get("M2")).toBe(true);
		threeBlocks.stop();

		const perTransition = new PlcScenario(build());
		await perTransition.cycles();
		perTransition.set("a", true);
		await perTransition.cycles();
		expect(perTransition.get("M1")).toBe(false);
		expect(perTransition.get("M2")).toBe(true);
		perTransition.stop();
	});
});

describe("grafcet-ladder : langue des titres", () => {
	const titles = (locale?: "fr" | "en") =>
		grafcetSections(spec, [{ variable: "q", steps: ["M1"] }], locale).map(
			(section) => section.title,
		);

	it("rédige les titres en français par défaut", () => {
		expect(titles()).toContain("Activation de l'étape initiale");
		expect(titles()).toContain("M0 -> M1");
		expect(titles()).toContain("Réinitialisation : étape initiale");
		expect(titles()).toContain("Sortie q");
	});

	it("rédige les titres en anglais sur demande, sans mot français résiduel", () => {
		const english = titles("en");
		expect(english).toContain("Initial step activation");
		expect(english).toContain("M0 -> M1");
		expect(english).toContain("Reset: initial step");
		expect(english).toContain("Output q");
		expect(english.join(" ")).not.toMatch(/[éèêà]/);
	});

	it("les sections anglaises ont autant d'éléments que les françaises", () => {
		expect(titles("en")).toHaveLength(titles("fr").length);
	});
});
