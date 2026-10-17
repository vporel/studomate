import PlcScenario from "@tests/utils/plc-scenario";
import { createTrafficLightLadderSolution } from "./traffic-light-ladder.template";

describe("traffic-light-ladder.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("boucle vert, orange, rouge tant que marche est vrai", async () => {
		const scenario = new PlcScenario(createTrafficLightLadderSolution());
		scenario.set("marche", true);
		await scenario.seconds(1);
		expect(scenario.get("vert")).toBe(true);
		await scenario.seconds(5);
		expect(scenario.get("orange")).toBe(true);
		await scenario.seconds(2);
		expect(scenario.get("rouge")).toBe(true);
		await scenario.seconds(5);
		expect(scenario.get("vert")).toBe(true);
		scenario.stop();
	});

	it("marche faux : le cycle en cours se termine et la séquence reste au rouge, puis reprend", async () => {
		const scenario = new PlcScenario(createTrafficLightLadderSolution());
		await scenario.seconds(8);
		expect(scenario.get("rouge")).toBe(true);
		await scenario.seconds(10);
		expect(scenario.get("rouge")).toBe(true);
		expect(scenario.get("vert")).toBe(false);
		scenario.set("marche", true);
		await scenario.seconds(1);
		expect(scenario.get("vert")).toBe(true);
		scenario.stop();
	});

	it("arret réinitialise la séquence sur le vert", async () => {
		const scenario = new PlcScenario(createTrafficLightLadderSolution());
		scenario.set("marche", true);
		await scenario.seconds(6);
		expect(scenario.get("orange")).toBe(true);
		await scenario.press("arret", 2);
		expect(scenario.get("vert")).toBe(true);
		expect(scenario.get("orange")).toBe(false);
		scenario.stop();
	});
});
