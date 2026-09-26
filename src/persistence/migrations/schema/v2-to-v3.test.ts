import v2ToV3 from "./v2-to-v3";

function makeV2Project() {
	return {
		id: "p1",
		schemaVersion: 2,
		name: "Machine",
		dialect: "FR",
		programs: {},
		hmiPages: {},
	};
}

describe("Migration v2 → v3 — version", () => {
	it("fait progresser `schemaVersion` à 3 sans toucher au reste d'un projet sans compteur", () => {
		const migrated = v2ToV3.migrate(makeV2Project());

		expect(migrated).toEqual({ ...makeV2Project(), schemaVersion: 3 });
	});

	it("ne touche pas un projet sans `programs` exploitable", () => {
		const migrated = v2ToV3.migrate({ ...makeV2Project(), programs: undefined });

		expect(migrated.programs).toBeUndefined();
		expect(migrated.schemaVersion).toBe(3);
	});
});

describe("Migration v2 → v3 — port de comptage CTU renommé en CU", () => {
	function counterBlock(name: string, counterType: "CTU" | "CTD") {
		return {
			id: `el-${name}`,
			type: "block",
			data: {
				blockType: "counter",
				params: { name, counterType, control: "raz", pv: "5" },
			},
			position: { row: 0, col: 3 },
		};
	}

	function projectWith(elements: unknown[], extra: Record<string, unknown> = {}) {
		return {
			...makeV2Project(),
			programs: {
				l1: {
					id: "l1",
					type: "ladder",
					sections: [{ id: "s1", elements, connections: [] }],
				},
			},
			...extra,
		};
	}

	it("renomme `Nom.IN` en `Nom.CU` dans les contacts, bobines, pinoches et widgets", () => {
		const project = projectWith(
			[
				counterBlock("C1", "CTU"),
				{ id: "k1", type: "contact", data: { variable: "C1.IN", type: "NO" } },
				{ id: "k2", type: "coil", data: { variable: "C1.IN", type: "normal" } },
				{
					id: "cmp",
					type: "block",
					data: { blockType: "compare", params: { in1: "C1.IN", in2: "x", operator: "=" } },
				},
			],
			{
				hmiPages: {
					p1: { widgets: [{ id: "w1", data: { variable: "C1.IN", label: "C1.IN" } }] },
				},
			},
		);

		const migrated = v2ToV3.migrate(project) as any;
		const elements = migrated.programs.l1.sections[0].elements;

		expect(elements[1].data.variable).toBe("C1.CU");
		expect(elements[2].data.variable).toBe("C1.CU");
		expect(elements[3].data.params.in1).toBe("C1.CU");
		expect(migrated.hmiPages.p1.widgets[0].data.variable).toBe("C1.CU");
	});

	it("ne touche ni les ports d'un CTD, ni ceux d'un timer, ni une chaîne qui ne fait que contenir `Nom.IN`", () => {
		const project = projectWith([
			counterBlock("C1", "CTU"),
			counterBlock("D1", "CTD"),
			{ id: "k1", type: "contact", data: { variable: "D1.CD", type: "NO" } },
			{ id: "k2", type: "contact", data: { variable: "T1.IN", type: "NO" } },
			{ id: "k3", type: "contact", data: { variable: "C1.INX", type: "NO" } },
			{ id: "k4", type: "contact", data: { variable: "C1.Q", type: "NO" } },
		]);

		const migrated = v2ToV3.migrate(project) as any;
		const elements = migrated.programs.l1.sections[0].elements;

		expect(elements[2].data.variable).toBe("D1.CD");
		expect(elements[3].data.variable).toBe("T1.IN");
		expect(elements[4].data.variable).toBe("C1.INX");
		expect(elements[5].data.variable).toBe("C1.Q");
	});

	it("renomme les références d'un CTU déclaré dans un autre programme Ladder", () => {
		const project = {
			...makeV2Project(),
			programs: {
				l1: {
					id: "l1",
					type: "ladder",
					sections: [{ id: "s1", elements: [counterBlock("C1", "CTU")] }],
				},
				l2: {
					id: "l2",
					type: "ladder",
					sections: [
						{
							id: "s2",
							elements: [
								{ id: "k1", type: "contact", data: { variable: "C1.IN", type: "NO" } },
							],
						},
					],
				},
			},
		};

		const migrated = v2ToV3.migrate(project) as any;

		expect(migrated.programs.l2.sections[0].elements[0].data.variable).toBe("C1.CU");
	});

	it("ne modifie pas l'objet d'entrée", () => {
		const project = projectWith([
			counterBlock("C1", "CTU"),
			{ id: "k1", type: "contact", data: { variable: "C1.IN", type: "NO" } },
		]);
		const snapshot = JSON.parse(JSON.stringify(project));

		v2ToV3.migrate(project);

		expect(project).toEqual(snapshot);
	});

	it("tolère des sections ou éléments malformés", () => {
		const project = {
			...makeV2Project(),
			programs: {
				l1: { id: "l1", type: "ladder", sections: [null, { elements: [null, {}] }] },
				l2: { id: "l2", type: "ladder" },
			},
		};

		expect(() => v2ToV3.migrate(project)).not.toThrow();
	});
});
