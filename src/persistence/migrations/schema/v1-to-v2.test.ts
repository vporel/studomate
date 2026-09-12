import { Dialect } from "@/expression-language/dialect.enum";
import v1ToV2 from "./v1-to-v2";

/** Projet v1 tel que persisté : `dialect` est l'ordinal de l'enum numérique. */
function makeV1Project(dialect: unknown) {
	return {
		id: "p1",
		schemaVersion: 1,
		name: "Machine",
		dialect,
		programs: {},
		hmiPages: {},
	};
}

describe("Migration v1 → v2 — dialecte en chaîne", () => {
	it("convertit l'ordinal 0 en `FR`", () => {
		const migrated = v1ToV2.migrate(makeV1Project(0));

		expect(migrated.dialect).toBe(Dialect.FR);
		expect(migrated.dialect).toBe("FR");
	});

	it("convertit l'ordinal 1 en `EN`", () => {
		const migrated = v1ToV2.migrate(makeV1Project(1));

		expect(migrated.dialect).toBe(Dialect.EN);
		expect(migrated.dialect).toBe("EN");
	});

	it("laisse une valeur déjà en chaîne intacte", () => {
		expect(v1ToV2.migrate(makeV1Project("EN")).dialect).toBe(Dialect.EN);
		expect(v1ToV2.migrate(makeV1Project("FR")).dialect).toBe(Dialect.FR);
	});

	it("retombe sur `FR` pour un dialecte absent ou aberrant", () => {
		expect(v1ToV2.migrate(makeV1Project(undefined)).dialect).toBe(Dialect.FR);
		expect(v1ToV2.migrate(makeV1Project(42)).dialect).toBe(Dialect.FR);
	});

	it("fait progresser `schemaVersion` à 2 sans toucher au reste", () => {
		const migrated = v1ToV2.migrate(makeV1Project(1));

		expect(migrated.schemaVersion).toBe(2);
		expect(migrated.id).toBe("p1");
		expect(migrated.name).toBe("Machine");
	});
});

describe("Migration v1 → v2 — retrait de `format` des GRAFCET", () => {
	it("retire `format` des programmes GRAFCET, laisse les autres intacts", () => {
		const project = {
			...makeV1Project(0),
			programs: {
				g1: {
					id: "g1",
					type: "grafcet",
					format: { type: "A4", orientation: "portrait" },
					steps: {},
				},
				l1: { id: "l1", type: "ladder", sections: [] },
			},
		};

		const migrated = v1ToV2.migrate(project);
		const programs = migrated.programs as Record<
			string,
			Record<string, unknown>
		>;

		expect(programs.g1).not.toHaveProperty("format");
		expect(programs.g1.steps).toEqual({});
		expect(programs.l1).toEqual({ id: "l1", type: "ladder", sections: [] });
	});

	it("ne touche pas un projet sans `programs` exploitable", () => {
		const migrated = v1ToV2.migrate({ ...makeV1Project(0), programs: undefined });

		expect(migrated.programs).toBeUndefined();
	});
});

describe("Migration v1 → v2 — normalisation de la géométrie des jonctions", () => {
	function junction(
		id: string,
		positions: number[],
		pivotPosition: number,
		nodeX: number,
		width: number,
	) {
		const branches: Record<string, { id: string; position: number }> = {};
		const branchesOrder: string[] = [];
		positions.forEach((position, i) => {
			branches[`${id}-b${i}`] = { id: `${id}-b${i}`, position };
			branchesOrder.push(`${id}-b${i}`);
		});
		return {
			id,
			type: "junction-or-start",
			data: { pivotPosition, branches, branchesOrder },
			position: { x: nodeX, y: 40 },
			size: { width, height: 30 },
		};
	}

	function projectWithJunction(j: ReturnType<typeof junction>) {
		return {
			...makeV1Project(0),
			programs: {
				g1: {
					id: "g1",
					type: "grafcet",
					junctionsOrStarts: { [j.id]: j },
				},
			},
		};
	}

	it("ramène la première branche à la marge et cale la largeur sur la dernière", () => {
		const migrated = v1ToV2.migrate(
			projectWithJunction(junction("j1", [50, 200], 120, 300, 250)),
		);
		const j = (migrated.programs as any).g1.junctionsOrStarts.j1;

		expect(j.data.branches["j1-b0"].position).toBe(10);
		expect(j.data.branches["j1-b1"].position).toBe(160);
		expect(j.position.x).toBe(340);
		expect(j.size.width).toBe(170);
	});

	it("laisse une jonction déjà canonique intacte", () => {
		const migrated = v1ToV2.migrate(
			projectWithJunction(junction("j1", [10, 190], 100, 300, 200)),
		);
		const j = (migrated.programs as any).g1.junctionsOrStarts.j1;

		expect(j.position.x).toBe(300);
		expect(j.size.width).toBe(200);
		expect(j.data.branches["j1-b1"].position).toBe(190);
	});

	it("ne touche pas un objet qui n'a pas la forme d'une jonction", () => {
		const project = {
			...makeV1Project(0),
			programs: {
				g1: {
					id: "g1",
					type: "grafcet",
					junctionsOrStarts: { bogus: { id: "bogus" } },
				},
			},
		};

		const migrated = v1ToV2.migrate(project);
		expect((migrated.programs as any).g1.junctionsOrStarts.bogus).toEqual({
			id: "bogus",
		});
	});
});
