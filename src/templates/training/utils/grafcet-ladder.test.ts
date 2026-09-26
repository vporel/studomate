import PlcScenario from "@tests/utils/plc-scenario";
import Project from "@/schemas/project/project.schema";
import { compilePipelineDetailed } from "@tests/utils/test-helpers";
import { no, setMainSections } from "@/templates/training/utils/ladder-dsl";
import { input, output } from "@/templates/training/utils/training-variables";
import {
	GrafcetLadderSpec,
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
	setMainSections(project, grafcetSections(spec, [{ variable: "q", steps: ["M1", "M2"] }]));
	return project;
}

describe("grafcet-ladder", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("génère des sections sans erreur d'analyse", () => {
		const { analysis } = compilePipelineDetailed(build());
		expect(analysis.issues.filter((i) => i.severity === "error")).toHaveLength(0);
	});

	it("déclare une mémoire par étape et par transition, plus l'initialisation", () => {
		expect(grafcetMemories(spec).map((v) => v.mnemonic)).toEqual([
			"M0", "M1", "M2", "T0", "T1", "T2", "init",
		]);
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
