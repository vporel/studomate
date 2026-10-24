import v4ToV5 from "./v4-to-v5";

function projectWithConvert(
	params: Record<string, unknown>,
	variables: { mnemonic: string; type: string }[] = [],
) {
	return {
		id: "p1",
		schemaVersion: 4,
		variables,
		programs: {
			l1: {
				id: "l1",
				type: "ladder",
				sections: [
					{
						id: "s1",
						elements: [
							{
								id: "b1",
								type: "block",
								data: { blockType: "convert", params },
							},
						],
					},
				],
			},
		},
	};
}

function convertParams(project: Record<string, unknown>) {
	const programs = project.programs as Record<string, any>;
	return programs.l1.sections[0].elements[0].data.params;
}

describe("Migration v4 → v5", () => {
	it("starts from version 4", () => {
		expect(v4ToV5.from).toBe(4);
	});

	it("takes the pin types from the declared types of the variables", () => {
		const migrated = v4ToV5.migrate(
			projectWithConvert({ in: "D", out: "I" }, [
				{ mnemonic: "D", type: "DINT" },
				{ mnemonic: "I", type: "INT" },
			]),
		);
		expect(migrated.schemaVersion).toBe(5);
		expect(convertParams(migrated)).toEqual({
			in: "D",
			out: "I",
			inType: "DINT",
			outType: "INT",
		});
	});

	it("falls back to INT and REAL for empty or unknown pins", () => {
		const migrated = v4ToV5.migrate(projectWithConvert({ in: "", out: "X" }));
		expect(convertParams(migrated)).toMatchObject({
			inType: "INT",
			outType: "REAL",
		});
	});

	it("falls back on a non-convertible variable type, then on the first supported target", () => {
		const migrated = v4ToV5.migrate(
			projectWithConvert({ in: "B", out: "I" }, [
				{ mnemonic: "B", type: "BOOL" },
				{ mnemonic: "I", type: "INT" },
			]),
		);
		expect(convertParams(migrated)).toMatchObject({
			inType: "INT",
			outType: "DINT",
		});
	});

	it("replaces an unsupported pair by the first supported target", () => {
		const migrated = v4ToV5.migrate(
			projectWithConvert({ in: "R", out: "W" }, [
				{ mnemonic: "R", type: "REAL" },
				{ mnemonic: "W", type: "WORD" },
			]),
		);
		expect(convertParams(migrated)).toMatchObject({
			inType: "REAL",
			outType: "INT",
		});
	});

	it("leaves other blocks and a project without programs untouched", () => {
		const project = { id: "p1", schemaVersion: 4 };
		expect(v4ToV5.migrate(project)).toEqual({ ...project, schemaVersion: 5 });
	});
});
