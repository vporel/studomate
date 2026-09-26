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

describe("Migration v2 → v3 — contact NO/NF explicite des widgets IHM", () => {
	function projectWithWidgets(widgets: Record<string, unknown>) {
		return { ...makeV2Project(), hmiPages: { p1: { id: "p1", widgets } } };
	}

	it("passe un bouton poussoir `momentary` ou sans comportement en `momentary-no`", () => {
		const project = projectWithWidgets({
			w1: { id: "w1", type: "push-button", data: { variable: "a", behavior: "momentary" } },
			w2: { id: "w2", type: "push-button", data: { variable: "b" } },
		});

		const migrated = v2ToV3.migrate(project) as any;

		expect(migrated.hmiPages.p1.widgets.w1.data).toEqual({ variable: "a", behavior: "momentary-no" });
		expect(migrated.hmiPages.p1.widgets.w2.data).toEqual({ variable: "b", behavior: "momentary-no" });
	});

	it("conserve les modes `set`, `reset` et `toggle` d'un bouton poussoir", () => {
		const project = projectWithWidgets({
			w1: { id: "w1", type: "push-button", data: { behavior: "set" } },
			w2: { id: "w2", type: "push-button", data: { behavior: "reset" } },
			w3: { id: "w3", type: "push-button", data: { behavior: "toggle" } },
		});

		const migrated = v2ToV3.migrate(project) as any;

		expect(migrated.hmiPages.p1.widgets.w1.data.behavior).toBe("set");
		expect(migrated.hmiPages.p1.widgets.w2.data.behavior).toBe("reset");
		expect(migrated.hmiPages.p1.widgets.w3.data.behavior).toBe("toggle");
	});

	it("donne `contact: \"no\"` à un interrupteur et ne touche pas les autres widgets", () => {
		const indicator = { id: "w2", type: "indicator", data: { variable: "v" } };
		const project = projectWithWidgets({
			w1: { id: "w1", type: "toggle-switch", data: { variable: "s", label: "S" } },
			w2: indicator,
		});

		const migrated = v2ToV3.migrate(project) as any;

		expect(migrated.hmiPages.p1.widgets.w1.data).toEqual({ variable: "s", label: "S", contact: "no" });
		expect(migrated.hmiPages.p1.widgets.w2).toEqual(indicator);
	});

	it("ne modifie pas l'objet d'entrée et tolère des pages malformées", () => {
		const project = {
			...projectWithWidgets({ w1: { id: "w1", type: "toggle-switch", data: {} } }),
		};
		(project.hmiPages as any).p2 = null;
		(project.hmiPages as any).p3 = { id: "p3" };
		const snapshot = JSON.parse(JSON.stringify(project));

		const migrated = v2ToV3.migrate(project) as any;

		expect(project).toEqual(snapshot);
		expect(migrated.hmiPages.p2).toBeNull();
		expect(migrated.hmiPages.p3).toEqual({ id: "p3" });
	});
});
