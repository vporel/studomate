import Grafcet, { DEFAULT_GRAFCET_FORMAT } from "../grafcet.schema";
import ElementsAddCommand from "./elements-add.command";

describe("ElementsAddCommand", () => {
	it("ajoute les éléments, et l'annulation les retire", () => {
		const grafcet = new Grafcet("g1", "G", DEFAULT_GRAFCET_FORMAT);
		const command = new ElementsAddCommand([
			{ type: "step", id: "step-1", data: { width: 10, height: 10 }, position: { x: 0, y: 0 } },
		]);

		const [, isValid] = command.execute(grafcet);

		expect(isValid).toBe(true);
		expect(grafcet.getElementById("step-1")).toBeDefined();

		command.cancel(grafcet);

		expect(grafcet.getElementById("step-1")).toBeUndefined();
	});

	it("round-trip execute→cancel laisse le grafcet inchangé", () => {
		const grafcet = new Grafcet("g1", "G", DEFAULT_GRAFCET_FORMAT);
		const before = JSON.stringify(grafcet);
		const command = new ElementsAddCommand([
			{ type: "step", id: "step-1", data: { width: 10, height: 10 }, position: { x: 0, y: 0 } },
		]);

		command.execute(grafcet);
		command.cancel(grafcet);

		expect(JSON.stringify(grafcet)).toBe(before);
	});
});
