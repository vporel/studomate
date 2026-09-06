import v0ToV1 from "./v0-to-v1";

/**
 * Forme d'un projet v0 tel que réellement persisté avant l'introduction du versionnement
 * (schémas au commit 322c72e) : un champ `grafcets`, les dimensions des éléments dans `data`,
 * ni `schemaVersion`, ni `programs`, ni `hmiPages`, ni Ladder.
 */
function makeV0Project() {
	return {
		id: "p1",
		appVersion: "0.1.0",
		name: "Machine",
		creationDate: "2026-08-01T10:00:00.000Z",
		lastModificationDate: "2026-08-02T10:00:00.000Z",
		author: "moi",
		variables: [
			{ id: "v1", mnemonic: "Var1", zone: "logic-input", type: "BOOL" },
		],
		grafcets: {
			g1: {
				id: "g1",
				name: "G1",
				format: { type: "A4", orientation: "portrait" },
				steps: [
					{
						id: "s1",
						type: "step",
						data: { number: 1, initial: true, width: 40, height: 40 },
						position: { x: 0, y: 0 },
					},
				],
				transitions: [
					{
						id: "t1",
						type: "transition",
						data: { expression: "VRAI", width: 60, height: 20 },
						position: { x: 0, y: 50 },
					},
				],
				actions: [],
				stepsReferralsSources: [],
				stepsReferralsTargets: [],
				junctionsAndStarts: [],
				junctionsAndEnds: [],
				junctionsOrStarts: [],
				junctionsOrEnds: [],
				comments: [],
				connections: [
					{
						id: "c1",
						source: { type: "step", id: "s1", handle: "source:successor" },
						target: {
							type: "transition",
							id: "t1",
							handle: "target:predecessor",
						},
						data: { points: [] },
					},
				],
			},
		},
	};
}

function mainPrograms(programs: Record<string, any>) {
	return Object.values(programs).filter(
		(p: any) => p.type === "ladder" && p.role === "main",
	);
}

describe("v0ToV1 — projet v0 réel (grafcet-only)", () => {
	it("renomme `grafcets` en `programs` et tague chaque programme", () => {
		const result = v0ToV1.migrate(makeV0Project()) as any;

		expect(result.grafcets).toBeUndefined();
		expect(result.programs.g1.type).toBe("grafcet");
	});

	it("indexe chaque collection d'éléments GRAFCET par id, garde `connections` en tableau", () => {
		const result = v0ToV1.migrate(makeV0Project()) as any;

		expect(result.programs.g1.steps).toEqual({
			s1: expect.objectContaining({ id: "s1" }),
		});
		expect(result.programs.g1.transitions).toEqual({
			t1: expect.objectContaining({ id: "t1" }),
		});
		expect(Array.isArray(result.programs.g1.connections)).toBe(true);
	});

	it("déplace les dimensions des éléments de `data` vers `size`", () => {
		const result = v0ToV1.migrate(makeV0Project()) as any;

		const step = result.programs.g1.steps.s1;
		expect(step.data).toEqual({ number: 1, initial: true });
		expect(step.size).toEqual({ width: 40, height: 40 });

		const transition = result.programs.g1.transitions.t1;
		expect(transition.data).toEqual({ expression: "VRAI" });
		expect(transition.size).toEqual({ width: 60, height: 20 });
	});

	it("préserve les connexions du grafcet", () => {
		const result = v0ToV1.migrate(makeV0Project()) as any;
		expect(result.programs.g1.connections).toHaveLength(1);
		expect(result.programs.g1.connections[0].id).toBe("c1");
	});

	it("retire les extrémités des tracés de connexion, ne garde que les coudes", () => {
		const project = makeV0Project() as any;
		project.grafcets.g1.connections = [
			// tracé personnalisé : source + 2 coudes + cible → 2 coudes
			{
				id: "c1",
				source: { type: "step", id: "s1", handle: "source:successor" },
				target: { type: "step", id: "s2", handle: "target:predecessor" },
				data: {
					points: [
						[0, 0],
						[10, 5],
						[20, 5],
						[30, 0],
					],
				},
			},
			// tracé droit stocké (source + cible) → vide
			{
				id: "c2",
				source: { type: "step", id: "s2", handle: "source:successor" },
				target: { type: "step", id: "s3", handle: "target:predecessor" },
				data: {
					points: [
						[0, 0],
						[40, 0],
					],
				},
			},
			// tracé déjà vide → reste vide
			{
				id: "c3",
				source: { type: "step", id: "s3", handle: "source:successor" },
				target: { type: "step", id: "s4", handle: "target:predecessor" },
				data: { points: [] },
			},
		];
		const result = v0ToV1.migrate(project) as any;
		const byId = Object.fromEntries(
			result.programs.g1.connections.map((c: any) => [c.id, c]),
		);
		expect(byId.c1.data.points).toEqual([
			[10, 5],
			[20, 5],
		]);
		expect(byId.c2.data.points).toEqual([]);
		expect(byId.c3.data.points).toEqual([]);
	});

	it("ajoute exactement un programme Main", () => {
		const result = v0ToV1.migrate(makeV0Project()) as any;
		expect(mainPrograms(result.programs)).toHaveLength(1);
	});

	it("pose `schemaVersion: 1` et `hmiPages: {}`", () => {
		const result = v0ToV1.migrate(makeV0Project()) as any;
		expect(result.schemaVersion).toBe(1);
		expect(result.hmiPages).toEqual({});
	});

	it("laisse intacts les champs qu'elle ne migre pas", () => {
		const result = v0ToV1.migrate(makeV0Project()) as any;
		expect(result.id).toBe("p1");
		expect(result.name).toBe("Machine");
		expect(result.author).toBe("moi");
		expect(result.creationDate).toBe("2026-08-01T10:00:00.000Z");
		expect(result.variables).toEqual([
			{ id: "v1", mnemonic: "Var1", zone: "logic-input", type: "BOOL" },
		]);
	});
});

describe("v0ToV1 — ne lève jamais sur des données plausibles", () => {
	it("projet vide", () => {
		expect(() => v0ToV1.migrate({})).not.toThrow();
		const result = v0ToV1.migrate({}) as any;
		expect(result.schemaVersion).toBe(1);
		expect(mainPrograms(result.programs)).toHaveLength(1);
	});

	it("`grafcets` vide → un Main quand même", () => {
		const result = v0ToV1.migrate({ id: "p1", grafcets: {} }) as any;
		expect(mainPrograms(result.programs)).toHaveLength(1);
	});

	it("entrée `grafcets` non-objet → ignorée sans lever", () => {
		const result = v0ToV1.migrate({
			grafcets: { g1: null, g2: "oops", g3: { id: "g3", steps: [] } },
		}) as any;
		expect(result.programs.g1).toBeUndefined();
		expect(result.programs.g2).toBeUndefined();
		expect(result.programs.g3.type).toBe("grafcet");
	});

	it("élément dont `data` n'est pas un objet → laissé tel quel ; entrée sans id → écartée", () => {
		const result = v0ToV1.migrate({
			grafcets: {
				g1: { id: "g1", steps: [{ id: "s1", data: null }, "pas-un-objet"] },
			},
		}) as any;
		expect(result.programs.g1.steps.s1).toEqual({ id: "s1", data: null });
		// La collection est désormais indexée par id : une entrée sans id exploitable ne peut
		// pas y figurer (« ce qui n'est pas compréhensible est écarté »).
		expect(Object.keys(result.programs.g1.steps)).toEqual(["s1"]);
	});

	it("élément sans width/height → `data` inchangé, pas de `size`", () => {
		const result = v0ToV1.migrate({
			grafcets: {
				g1: { id: "g1", steps: [{ id: "s1", data: { number: 3 } }] },
			},
		}) as any;
		expect(result.programs.g1.steps.s1.data).toEqual({ number: 3 });
		expect(result.programs.g1.steps.s1.size).toBeUndefined();
	});

	it("collection d'éléments non-array → ignorée", () => {
		expect(() =>
			v0ToV1.migrate({
				grafcets: { g1: { id: "g1", steps: null, actions: undefined } },
			}),
		).not.toThrow();
	});
	it("pose `hmiPages: {}` même si une forme non versionnée en portait déjà", () => {
		const result = v0ToV1.migrate({
			programs: {},
			hmiPages: {
				h1: { id: "h1", widgets: [{ id: "w1", type: "text", data: {} }] },
			},
		}) as any;
		expect(result.hmiPages).toEqual({});
	});
});
