import Connection from "./connection.schema";

describe("Connection", () => {
	it("copy() clone en profondeur les points du tracé", () => {
		const connection = new Connection(
			"c1",
			{ id: "a", type: "contact", handle: "source" },
			{ id: "b", type: "coil", handle: "target" },
			{ points: [[10, 20]] },
		);

		const copy = connection.copy();

		expect(copy).not.toBe(connection);
		expect(copy.data.points).not.toBe(connection.data.points);
		expect(copy).toEqual(connection);
	});

	it("createFromJSON reconstruit une connexion identique après un aller-retour", () => {
		const connection = new Connection(
			"c1",
			{ id: "a", type: "contact", handle: "source" },
			{ id: "b", type: "coil", handle: "target" },
			{ points: [[1, 2]] },
		);

		const restored = Connection.createFromJSON(JSON.stringify(connection));

		expect(restored).toBeInstanceOf(Connection);
		expect(restored).toEqual(connection);
	});

	it("data.points est vide par défaut (rendu en ligne droite)", () => {
		const connection = new Connection(
			"c1",
			{ id: "a", type: "contact", handle: "source" },
			{ id: "b", type: "coil", handle: "target" },
		);
		expect(connection.data.points).toEqual([]);
	});
});
