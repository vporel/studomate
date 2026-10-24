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
} from "@/templates/training/utils/grafcet-ladder";

const spec: GrafcetLadderSpec = {
	steps: ["M0", "M1", "M2"],
	initial: ["M0"],
	transitions: [
		{ name: "T0", from: ["M0"], to: ["M1"], receptivity: [no("a")] },
		{ name: "T1", from: ["M1"], to: ["M2"], receptivity: [] },
		{ name: "T2", from: ["M2"], to: ["M0"], receptivity: [no("b")] },
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

	it("déclare une mémoire par étape et par transition, plus l'initialisation", () => {
		expect(grafcetMemories(spec).map((v) => v.mnemonic)).toEqual([
			"M0",
			"M1",
			"M2",
			"T0",
			"T1",
			"T2",
			"init",
		]);
	});

	it("expose la mémoire d'initialisation seule, avec son nom par défaut ou personnalisé", () => {
		expect(grafcetInitMemory(spec).mnemonic).toBe("init");
		expect(grafcetInitMemory({ ...spec, initMemory: "init_x" }).mnemonic).toBe(
			"init_x",
		);
	});

	it("active l'étape initiale au premier cycle puis franchit au plus une transition par cycle", async () => {
		const scenario = new PlcScenario(build());
		await scenario.cycles();
		expect(scenario.get("M0")).toBe(true);
		scenario.set("a", true);
		await scenario.cycles();
		expect(scenario.get("M1")).toBe(true);
		expect(scenario.get("M0")).toBe(false);
		expect(scenario.get("M2")).toBe(false);
		await scenario.cycles();
		expect(scenario.get("M2")).toBe(true);
		expect(scenario.get("M1")).toBe(false);
		scenario.stop();
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

describe("grafcet-ladder : langue des titres", () => {
	const titles = (locale?: "fr" | "en") =>
		grafcetSections(spec, [{ variable: "q", steps: ["M1"] }], locale).map(
			(section) => section.title,
		);

	it("rédige les titres en français par défaut", () => {
		expect(titles()).toContain("Activation de l'étape initiale");
		expect(titles()).toContain("Condition de franchissement T0");
		expect(titles()).toContain("Désactivation par T1");
		expect(titles()).toContain("Réinitialisation : étape initiale");
		expect(titles()).toContain("Sortie q");
	});

	it("rédige les titres en anglais sur demande, sans mot français résiduel", () => {
		const english = titles("en");
		expect(english).toContain("Initial step activation");
		expect(english).toContain("Crossing condition T0");
		expect(english).toContain("Deactivation by T1");
		expect(english).toContain("Reset: initial step");
		expect(english).toContain("Output q");
		expect(english.join(" ")).not.toMatch(/[éèêà]/);
	});

	it("les sections anglaises ont autant d'éléments que les françaises", () => {
		expect(titles("en")).toHaveLength(titles("fr").length);
	});
});
