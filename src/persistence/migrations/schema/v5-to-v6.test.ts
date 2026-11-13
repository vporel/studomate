import v5ToV6 from "./v5-to-v6";

const connection = (
	id: string,
	source: { type: string; handle: string },
	target: { type: string; handle: string },
) => ({
	id,
	source: { ...source, id: `${id}-source` },
	target: { ...target, id: `${id}-target` },
	data: { points: [[1, 2]] },
});

function projectWith(programs: Record<string, unknown>) {
	return { id: "p1", schemaVersion: 5, programs };
}

describe("Migration v5 → v6", () => {
	it("starts from version 5", () => {
		expect(v5ToV6.from).toBe(5);
	});

	it("renames the incoming handle of the actions and keeps the rest of the connection", () => {
		const migrated = v5ToV6.migrate(
			projectWith({
				g1: {
					id: "g1",
					type: "grafcet",
					connections: [
						connection(
							"c1",
							{ type: "step", handle: "source:action" },
							{ type: "action", handle: "target:step" },
						),
					],
				},
			}),
		);

		expect(migrated.schemaVersion).toBe(6);
		expect((migrated.programs as any).g1.connections).toEqual([
			{
				id: "c1",
				source: { type: "step", id: "c1-source", handle: "source:action" },
				target: {
					type: "action",
					id: "c1-target",
					handle: "target:predecessor",
				},
				data: { points: [[1, 2]] },
			},
		]);
	});

	it("leaves the other connections and the ladder programs untouched", () => {
		const stepToTransition = connection(
			"c2",
			{ type: "step", handle: "source:successor" },
			{ type: "transition", handle: "target:predecessor" },
		);
		const ladder = { id: "l1", type: "ladder", sections: [] };
		const migrated = v5ToV6.migrate(
			projectWith({
				g1: { id: "g1", type: "grafcet", connections: [stepToTransition] },
				l1: ladder,
			}),
		);

		const programs = migrated.programs as any;
		expect(programs.g1.connections).toEqual([stepToTransition]);
		expect(programs.l1).toBe(ladder);
	});

	it("tolerates a project without programs and a grafcet without connections", () => {
		expect(v5ToV6.migrate({ id: "p1", schemaVersion: 5 })).toEqual({
			id: "p1",
			schemaVersion: 6,
		});
		const migrated = v5ToV6.migrate(
			projectWith({ g1: { id: "g1", type: "grafcet" } }),
		);
		expect((migrated.programs as any).g1).toEqual({
			id: "g1",
			type: "grafcet",
		});
	});
});
