import PlcScenario from "@tests/utils/plc-scenario";
import Project from "@/schemas/project/project.schema";
import {
	coil,
	invertedCoil,
	no,
	or,
	resetCoil,
	section,
	setCoil,
	setMainSections,
} from "@/templates/training/utils/ladder-dsl";
import {
	input,
	memory,
	output,
} from "@/templates/training/utils/training-variables";

describe("coils in parallel in a network", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("applique tous les effets avec la condition du début du réseau, quel que soit l'ordre des bobines", async () => {
		const project = new Project("p", "parallel coils", "");
		project.variables.push(
			input("go"),
			memory("A"),
			memory("B"),
			memory("C"),
			output("Q"),
		);
		setMainSections(project, [
			section("init", "", no("go"), or([setCoil("A")], [setCoil("B")])),
			section(
				"transition",
				"",
				no("A"),
				no("B"),
				or([resetCoil("A")], [resetCoil("B")], [setCoil("C")]),
			),
		]);
		const scenario = new PlcScenario(project);
		scenario.set("go", true);
		await scenario.cycles(1);
		expect(scenario.get("C")).toBe(true);
		expect(scenario.get("A")).toBe(false);
		expect(scenario.get("B")).toBe(false);
		scenario.stop();
	});

	it("un reset placé avant un set n'empêche pas le set quand la condition lit la variable remise à zéro", async () => {
		const project = new Project("p", "reset then set", "");
		project.variables.push(input("go"), memory("X0"), memory("X1"));
		setMainSections(project, [
			section("start", "", no("go"), setCoil("X0")),
			section("X0 -> X1", "", no("X0"), or([resetCoil("X0")], [setCoil("X1")])),
		]);
		const scenario = new PlcScenario(project);
		scenario.set("go", true);
		await scenario.cycles(1);
		expect(scenario.get("X0")).toBe(false);
		expect(scenario.get("X1")).toBe(true);
		scenario.stop();
	});

	it("une bobine normale et une bobine inversée en parallèle suivent la condition dans les deux sens", async () => {
		const project = new Project("p", "normal and inverted", "");
		project.variables.push(input("go"), output("Q1"), output("Q2"));
		setMainSections(project, [
			section("outputs", "", no("go"), or([coil("Q1")], [invertedCoil("Q2")])),
		]);
		const scenario = new PlcScenario(project);
		await scenario.cycles(1);
		expect(scenario.get("Q1")).toBe(false);
		expect(scenario.get("Q2")).toBe(true);
		scenario.set("go", true);
		await scenario.cycles(1);
		expect(scenario.get("Q1")).toBe(true);
		expect(scenario.get("Q2")).toBe(false);
		scenario.stop();
	});
});
