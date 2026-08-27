import Grafcet, { DEFAULT_GRAFCET_FORMAT } from "../grafcet.schema";
import ElementsRemoveCommand from "./elements-remove.command";

describe("ElementsRemoveCommand", () => {
	function grafcetWithOneStep(): Grafcet {
		const grafcet = new Grafcet("g1", "G", DEFAULT_GRAFCET_FORMAT);
		grafcet.addElements([
			{
				type: "step",
				id: "step-1",
				data: {},
				position: { x: 0, y: 0 },
				size: { width: 10, height: 10 },
			},
		]);
		return grafcet;
	}

	it("retire les éléments, et l'annulation les restaure", () => {
		const grafcet = grafcetWithOneStep();
		const command = new ElementsRemoveCommand([
			{
				type: "step",
				id: "step-1",
				data: {},
				position: { x: 0, y: 0 },
				size: { width: 10, height: 10 },
			},
		]);

		const [, isValid] = command.execute(grafcet);

		expect(isValid).toBe(true);
		expect(grafcet.getElementById("step-1")).toBeUndefined();

		command.cancel(grafcet);

		expect(grafcet.getElementById("step-1")).toBeDefined();
	});

	it("round-trip execute→cancel laisse le grafcet inchangé", () => {
		const grafcet = grafcetWithOneStep();
		const before = JSON.stringify(grafcet);
		const command = new ElementsRemoveCommand([
			{
				type: "step",
				id: "step-1",
				data: {},
				position: { x: 0, y: 0 },
				size: { width: 10, height: 10 },
			},
		]);

		command.execute(grafcet);
		command.cancel(grafcet);

		expect(JSON.stringify(grafcet)).toBe(before);
	});
});
