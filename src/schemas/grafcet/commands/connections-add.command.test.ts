import Connection from "../connection.schema";
import Grafcet, { DEFAULT_GRAFCET_FORMAT } from "../grafcet.schema";
import ConnectionsAddCommand from "./connections-add.command";

describe("ConnectionsAddCommand", () => {
	function grafcetWithStepAndTransition(): Grafcet {
		const grafcet = new Grafcet("g1", "G", DEFAULT_GRAFCET_FORMAT);
		grafcet.addElements([
			{ type: "step", id: "step-1", data: { number: "0" }, position: { x: 0, y: 0 } },
			{ type: "transition", id: "trans-1", data: {}, position: { x: 0, y: 50 } },
		]);
		return grafcet;
	}

	it("ajoute la connexion, et l'annulation la retire", () => {
		const grafcet = grafcetWithStepAndTransition();
		const connection = new Connection(
			"c1",
			{ type: "step", id: "step-1", handle: "source:successor" },
			{ type: "transition", id: "trans-1", handle: "target:predecessor" },
		);
		const command = new ConnectionsAddCommand([connection]);

		const [, isValid] = command.execute(grafcet);

		expect(isValid).toBe(true);
		expect(grafcet.getConnection("step-1", "trans-1")).toBeDefined();

		command.cancel(grafcet);

		expect(grafcet.getConnection("step-1", "trans-1")).toBeUndefined();
	});

	it("round-trip execute→cancel laisse le grafcet inchangé", () => {
		const grafcet = grafcetWithStepAndTransition();
		const before = JSON.stringify(grafcet);
		const connection = new Connection(
			"c1",
			{ type: "step", id: "step-1", handle: "source:successor" },
			{ type: "transition", id: "trans-1", handle: "target:predecessor" },
		);
		const command = new ConnectionsAddCommand([connection]);

		command.execute(grafcet);
		command.cancel(grafcet);

		expect(JSON.stringify(grafcet)).toBe(before);
	});
});
