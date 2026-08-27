import Grafcet, { DEFAULT_GRAFCET_FORMAT } from "../grafcet.schema";
import ElementsUpdateCommand from "./elements-update.command";

describe("ElementsUpdateCommand", () => {
	function grafcetWithOneStep(): Grafcet {
		const grafcet = new Grafcet("g1", "G", DEFAULT_GRAFCET_FORMAT);
		grafcet.addElements([
			{
				type: "step",
				id: "step-1",
				data: { number: "0" },
				position: { x: 0, y: 0 },
				size: { width: 10, height: 10 },
			},
		]);
		return grafcet;
	}

	it("applique la nouvelle position/donnée, et l'annulation restaure la précédente", () => {
		const grafcet = grafcetWithOneStep();
		const command = new ElementsUpdateCommand([
			{
				type: "step",
				id: "step-1",
				data: { number: "1" },
				previousData: { number: "0" },
				position: { x: 50, y: 50 },
				previousPosition: { x: 0, y: 0 },
			},
		]);

		command.execute(grafcet);

		const updated = grafcet.getElementById("step-1")! as any;
		expect(updated.data.number).toBe("1");
		expect(updated.position).toEqual({ x: 50, y: 50 });

		command.cancel(grafcet);

		const restored = grafcet.getElementById("step-1")! as any;
		expect(restored.data.number).toBe("0");
		expect(restored.position).toEqual({ x: 0, y: 0 });
	});

	it("round-trip execute→cancel laisse le grafcet inchangé", () => {
		const grafcet = grafcetWithOneStep();
		const before = JSON.stringify(grafcet);
		const command = new ElementsUpdateCommand([
			{
				type: "step",
				id: "step-1",
				data: { number: "1" },
				previousData: { number: "0" },
				position: { x: 50, y: 50 },
				previousPosition: { x: 0, y: 0 },
			},
		]);

		command.execute(grafcet);
		command.cancel(grafcet);

		expect(JSON.stringify(grafcet)).toBe(before);
	});
});
