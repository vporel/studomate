import Connection from "../connection.schema";
import Grafcet, { DEFAULT_GRAFCET_FORMAT } from "../grafcet.schema";
import ConnectionsUpdateCommand from "./connections-update.command";

describe("ConnectionsUpdateCommand", () => {
	function grafcetWithConnection(): { grafcet: Grafcet; connection: Connection } {
		const grafcet = new Grafcet("g1", "G", DEFAULT_GRAFCET_FORMAT);
		grafcet.addElements([
			{ type: "step", id: "step-1", data: { number: "0", width: 10, height: 10 }, position: { x: 0, y: 0 } },
			{ type: "transition", id: "trans-1", data: {}, position: { x: 0, y: 50 } },
		]);
		const connection = new Connection(
			"c1",
			{ type: "step", id: "step-1", handle: "source:successor" },
			{ type: "transition", id: "trans-1", handle: "target:predecessor" },
			{ points: [] },
		);
		grafcet.addConnections([connection]);
		return { grafcet, connection };
	}

	it("applique la nouvelle donnée, et l'annulation restaure la précédente", () => {
		const { grafcet, connection: previous } = grafcetWithConnection();
		const updated = new Connection(previous.id, previous.source, previous.target, { points: [[1, 2]] });
		const command = new ConnectionsUpdateCommand([{ connection: updated, previous }]);

		const [, isValid] = command.execute(grafcet);

		expect(isValid).toBe(true);
		expect(grafcet.getConnection("step-1", "trans-1")?.data.points).toEqual([[1, 2]]);

		command.cancel(grafcet);

		expect(grafcet.getConnection("step-1", "trans-1")?.data.points).toEqual([]);
	});

	it("isCommandValid: false et ne modifie rien quand les données n'ont pas changé", () => {
		const { grafcet, connection: previous } = grafcetWithConnection();
		const unchanged = new Connection(previous.id, previous.source, previous.target, { points: [] });
		const command = new ConnectionsUpdateCommand([{ connection: unchanged, previous }]);
		const before = JSON.stringify(grafcet);

		const [, isValid] = command.execute(grafcet);

		expect(isValid).toBe(false);
		expect(JSON.stringify(grafcet)).toBe(before);
	});

	it("round-trip execute→cancel laisse le grafcet inchangé", () => {
		const { grafcet, connection: previous } = grafcetWithConnection();
		const before = JSON.stringify(grafcet);
		const updated = new Connection(previous.id, previous.source, previous.target, { points: [[1, 2]] });
		const command = new ConnectionsUpdateCommand([{ connection: updated, previous }]);

		command.execute(grafcet);
		command.cancel(grafcet);

		expect(JSON.stringify(grafcet)).toBe(before);
	});
});
