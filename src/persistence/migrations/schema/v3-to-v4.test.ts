import v3ToV4 from "./v3-to-v4";

describe("Migration v3 → v4", () => {
	it("bumps `schemaVersion` to 4 and leaves the rest of the project untouched", () => {
		const project = {
			id: "p1",
			schemaVersion: 3,
			dialect: "FR",
			variables: [{ id: "v1", mnemonic: "A", zone: "memory", type: "BOOL" }],
		};

		expect(v3ToV4.migrate(project)).toEqual({ ...project, schemaVersion: 4 });
	});

	it("starts from version 3", () => {
		expect(v3ToV4.from).toBe(3);
	});
});
