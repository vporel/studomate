import PlcScenario from "@tests/utils/plc-scenario";
import Project from "@/schemas/project/project.schema";
import { compilePipelineDetailed } from "@tests/utils/test-helpers";
import {
	coil,
	no,
	section,
	setCoil,
	setMainSections,
} from "@/templates/training/utils/ladder-dsl";
import { input, output } from "@/templates/training/utils/training-variables";
import {
	calledPrograms,
	executionSections,
} from "@tests/utils/execution-sections";
import {
	GrafcetLadderSpec,
	addGrafcetPrograms,
	grafcetInitSection,
	grafcetMemories,
	grafcetProgramSections,
	grafcetSections,
	grafcetThreeBlockProgramSections,
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

	it("déclare une mémoire par étape, sans mémoire d'initialisation ni de transition", () => {
		expect(grafcetMemories(spec).map((v) => v.mnemonic)).toEqual([
			"M0",
			"M1",
			"M2",
		]);
	});

	it("un seul réseau d'initialisation : un contact NF par étape, puis une bobine S sur chaque étape initiale", () => {
		const { elements } = grafcetInitSection({
			...spec,
			initial: ["M0", "M1"],
		});
		const contacts = elements.filter((e) => e.type === "contact");
		const coils = elements.filter((e) => e.type === "coil");
		expect(contacts.map((e) => e.data)).toEqual(
			spec.steps.map((variable) => ({ variable, type: "NF" })),
		);
		expect(coils.map((e) => e.data)).toEqual([
			{ variable: "M0", type: "set" },
			{ variable: "M1", type: "set" },
		]);
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

	it("déclare une mémoire par étape et par transition, sans mémoire d'initialisation", () => {
		expect(grafcetThreeBlockMemories(spec).map((v) => v.mnemonic)).toEqual([
			"M0",
			"M1",
			"M2",
			"T0",
			"T1",
			"T2",
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

describe("grafcet-ladder : deux programmes", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	const outputs = [{ variable: "q", steps: ["M1", "M2"] }];

	function buildPrograms(
		faults?: ReturnType<typeof grafcetProgramSections>["cycle"],
	): Project {
		const project = new Project("p", "test", "");
		project.variables.push(
			input("a"),
			input("b"),
			input("stop"),
			output("q"),
			...grafcetMemories(spec),
		);
		addGrafcetPrograms(project, {
			...grafcetProgramSections(spec, outputs),
			faults,
		});
		return project;
	}

	it("sépare l'évolution (initialisation, transitions, réinitialisation) des sorties", () => {
		const { cycle, outputs: outputSections } = grafcetProgramSections(
			spec,
			outputs,
		);
		expect(cycle.map((s) => s.title)).toEqual([
			"Activation de l'étape initiale",
			"M0 -> M1",
			"M1 -> M2",
			"M2 -> M0",
			"Réinitialisation : désactivation",
			"Réinitialisation : étape initiale",
		]);
		expect(outputSections.map((s) => s.title)).toEqual(["Sortie q"]);
	});

	it("grafcetSections concatène le cycle puis les sorties", () => {
		const { cycle, outputs: outputSections } = grafcetProgramSections(
			spec,
			outputs,
		);
		expect(grafcetSections(spec, outputs).map((s) => s.title)).toEqual(
			[...cycle, ...outputSections].map((s) => s.title),
		);
	});

	it("le Main appelle Cycle_automatique puis Sorties, sans réseau vide en tête", () => {
		const project = buildPrograms();
		expect(calledPrograms(project).map((p) => p.name)).toEqual([
			"Cycle_automatique",
			"Sorties",
		]);
		expect(project.main.sections).toHaveLength(2);
	});

	it("le Main appelle Defauts en premier quand des défauts sont fournis", () => {
		const project = buildPrograms([
			section("Défaut", "", no("a"), setCoil("q")),
		]);
		expect(calledPrograms(project).map((p) => p.name)).toEqual([
			"Defauts",
			"Cycle_automatique",
			"Sorties",
		]);
	});

	it("garde les réseaux déjà présents dans le Main avant les appels", () => {
		const project = new Project("p", "test", "");
		project.main.sections = [section("Existant", "", no("a"), coil("q"))];
		addGrafcetPrograms(project, grafcetProgramSections(spec, outputs));
		expect(project.main.sections.map((s) => s.title)).toEqual([
			"Existant",
			"Cycle_automatique",
			"Sorties",
		]);
	});

	it("nomme les programmes en anglais sur demande", () => {
		const project = new Project("p", "test", "");
		addGrafcetPrograms(
			project,
			{ ...grafcetProgramSections(spec, outputs, "en"), faults: [] },
			"en",
		);
		expect(calledPrograms(project).map((p) => p.name)).toEqual([
			"Faults",
			"Automatic_cycle",
			"Outputs",
		]);
	});

	it("exécute les sorties après l'évolution complète des étapes, sans erreur d'analyse", async () => {
		const project = buildPrograms();
		const { analysis } = compilePipelineDetailed(project);
		expect(analysis.issues.filter((i) => i.severity === "error")).toHaveLength(
			0,
		);
		const scenario = new PlcScenario(project);
		await scenario.cycles();
		scenario.set("a", true);
		await scenario.cycles();
		expect(scenario.get("M2")).toBe(true);
		expect(scenario.get("q")).toBe(true);
		scenario.stop();
	});

	it("ordonne les réseaux d'exécution : cycle d'abord, sorties ensuite", () => {
		const titles = executionSections(buildPrograms()).map((s) => s.title);
		expect(titles.indexOf("M2 -> M0")).toBeLessThan(titles.indexOf("Sortie q"));
	});

	it("la méthode en trois blocs place les blocs 1 et 2 dans le cycle et le bloc 3 dans les sorties", () => {
		const { cycle, outputs: outputSections } = grafcetThreeBlockProgramSections(
			spec,
			outputs,
		);
		expect(cycle.map((s) => s.title)).toEqual(
			expect.arrayContaining([
				"Condition de franchissement T0",
				"Désactivation par T0",
				"Activation par T0",
			]),
		);
		expect(outputSections.map((s) => s.title)).toEqual(["Sortie q"]);
	});
});
