import Connection from "../connection.schema";
import Grafcet, { DEFAULT_GRAFCET_FORMAT } from "../grafcet.schema";
import ConnectionsRemoveCommand from "./connections-remove.command";

describe("ConnectionsRemoveCommand", () => {
	function grafcetWithConnection(): { grafcet: Grafcet; connection: Connection } {
		const grafcet = new Grafcet("g1", "G", DEFAULT_GRAFCET_FORMAT);
		grafcet.addElements([
			{ type: "step", id: "step-1", data: { number: "0" }, position: { x: 0, y: 0 } },
			{ type: "transition", id: "trans-1", data: {}, position: { x: 0, y: 50 } },
		]);
		const connection = new Connection(
			"c1",
			{ type: "step", id: "step-1", handle: "source:successor" },
			{ type: "transition", id: "trans-1", handle: "target:predecessor" },
		);
		grafcet.addConnections([connection]);
		return { grafcet, connection };
	}

	it("retire la connexion, et l'annulation la restaure", () => {
		const { grafcet, connection } = grafcetWithConnection();
		const command = new ConnectionsRemoveCommand([connection]);

		const [, isValid] = command.execute(grafcet);

		expect(isValid).toBe(true);
		expect(grafcet.getConnection("step-1", "trans-1")).toBeUndefined();

		command.cancel(grafcet);

		expect(grafcet.getConnection("step-1", "trans-1")).toBeDefined();
	});

	it("round-trip execute→cancel laisse le grafcet inchangé", () => {
		const { grafcet, connection } = grafcetWithConnection();
		const before = JSON.stringify(grafcet);
		const command = new ConnectionsRemoveCommand([connection]);

		command.execute(grafcet);
		command.cancel(grafcet);

		expect(JSON.stringify(grafcet)).toBe(before);
	});
});
