import {
	GaugeData,
	HMI_WIDGET_DEFINITIONS,
	HmiWidget,
	HmiWidgetType,
} from "./hmi-widget.schema";

const ALL_TYPES: HmiWidgetType[] = [
	"push-button",
	"indicator",
	"toggle-switch",
	"numeric-display",
	"gauge",
	"numeric-input",
];

describe("HmiWidget.create", () => {
	it("génère un id unique à chaque appel", () => {
		const a = HmiWidget.create("push-button", 0, 0);
		const b = HmiWidget.create("push-button", 0, 0);
		expect(a.id).not.toBe(b.id);
	});

	it("positionne le widget aux coordonnées données", () => {
		const w = HmiWidget.create("indicator", 40, 80);
		expect(w.position).toEqual({ x: 40, y: 80 });
	});

	it("initialise variable à vide et label au libellé par défaut du type", () => {
		ALL_TYPES.forEach((type) => {
			const w = HmiWidget.create(type, 0, 0);
			const data = w.data as { variable: string; label: string };
			const defaultData = HMI_WIDGET_DEFINITIONS[type].defaultData as {
				variable: string;
				label: string;
			};
			expect(data.variable).toBe("");
			expect(data.label).toBe(defaultData.label);
		});
	});

	it("retourne une copie profonde des données par défaut (pas la référence partagée)", () => {
		const a = HmiWidget.create("gauge", 0, 0);
		const b = HmiWidget.create("gauge", 0, 0);
		if (a.type !== "gauge" || b.type !== "gauge")
			throw new Error("unreachable");
		a.data.style!.orientation = "vertical";
		expect(b.data.style?.orientation).toBe("horizontal");
		expect(HMI_WIDGET_DEFINITIONS.gauge.defaultData).toMatchObject({
			style: { orientation: "horizontal" },
		});
	});

	it("initialise min=0 et max=100 pour gauge", () => {
		const w = HmiWidget.create("gauge", 0, 0);
		if (w.type !== "gauge") throw new Error("unreachable");
		expect(w.data.min).toBe(0);
		expect(w.data.max).toBe(100);
	});

	it("initialise l'orientation à horizontal pour gauge", () => {
		const w = HmiWidget.create("gauge", 0, 0);
		if (w.type !== "gauge") throw new Error("unreachable");
		expect(w.data.style?.orientation).toBe("horizontal");
	});

	it("initialise min=0 et max=100 pour numeric-input", () => {
		const w = HmiWidget.create("numeric-input", 0, 0);
		if (w.type !== "numeric-input") throw new Error("unreachable");
		expect(w.data.min).toBe(0);
		expect(w.data.max).toBe(100);
	});

	it("initialise unit et decimalPlaces pour numeric-display", () => {
		const w = HmiWidget.create("numeric-display", 0, 0);
		if (w.type !== "numeric-display") throw new Error("unreachable");
		expect(w.data.unit).toBe("");
		expect(w.data.decimalPlaces).toBe(0);
	});

	it("ne définit pas min/max pour push-button", () => {
		const w = HmiWidget.create("push-button", 0, 0);
		expect((w.data as Partial<GaugeData>).min).toBeUndefined();
		expect((w.data as Partial<GaugeData>).max).toBeUndefined();
	});

	it("initialise la taille à la taille par défaut du type", () => {
		ALL_TYPES.forEach((type) => {
			const w = HmiWidget.create(type, 0, 0);
			expect(w.size).toEqual(HMI_WIDGET_DEFINITIONS[type].defaultSize);
		});
	});

	it("initialise fill/stroke pour rectangle et ellipse", () => {
		(["rectangle", "ellipse"] as const).forEach((type) => {
			const w = HmiWidget.create(type, 0, 0);
			if (w.type !== "rectangle" && w.type !== "ellipse")
				throw new Error("unreachable");
			expect(typeof w.data.style.fill).toBe("string");
			expect(typeof w.data.style.stroke).toBe("string");
		});
	});

	it("initialise le contenu texte pour text", () => {
		const w = HmiWidget.create("text", 0, 0);
		if (w.type !== "text") throw new Error("unreachable");
		expect(w.data.text).toBe("Texte");
	});

	it("utilise la taille de départ fournie plutôt que la taille par défaut du type", () => {
		const w = HmiWidget.create("ellipse", 0, 0, { width: 40, height: 40 });
		expect(w.size).toEqual({ width: 40, height: 40 });
	});

	it("lockAspectRatio est absent par défaut", () => {
		const w = HmiWidget.create("ellipse", 0, 0);
		if (w.type !== "ellipse") throw new Error("unreachable");
		expect(w.data.lockAspectRatio).toBeUndefined();
	});

	it("applique dataOverride par-dessus les données par défaut du type", () => {
		const w = HmiWidget.create(
			"ellipse",
			0,
			0,
			{ width: 40, height: 40 },
			{ lockAspectRatio: true },
		);
		if (w.type !== "ellipse") throw new Error("unreachable");
		expect(w.data.lockAspectRatio).toBe(true);
		expect(w.data.style.fill).toBe("#e0e0e0");
	});

	it("stackOrder vaut 0 par défaut", () => {
		const w = HmiWidget.create("push-button", 0, 0);
		expect(w.stackOrder).toBe(0);
	});

	it("utilise le stackOrder fourni", () => {
		const w = HmiWidget.create("push-button", 0, 0, undefined, undefined, 7);
		expect(w.stackOrder).toBe(7);
	});
});

describe("HmiWidget.nextStackOrder", () => {
	it("retourne 0 pour une liste vide", () => {
		expect(HmiWidget.nextStackOrder([])).toBe(0);
	});

	it("retourne le plus grand stackOrder + 1", () => {
		const widgets = [
			HmiWidget.create("push-button", 0, 0, undefined, undefined, 3),
			HmiWidget.create("indicator", 0, 0, undefined, undefined, 9),
			HmiWidget.create("gauge", 0, 0, undefined, undefined, 5),
		];
		expect(HmiWidget.nextStackOrder(widgets)).toBe(10);
	});
});

describe("HmiWidget.nextName", () => {
	it("génère Label_1 pour une liste vide", () => {
		expect(HmiWidget.nextName("rectangle", [])).toBe("Rectangle_1");
	});

	it("avance au premier numéro libre", () => {
		const widgets = [
			HmiWidget.create(
				"rectangle",
				0,
				0,
				undefined,
				undefined,
				0,
				"Rectangle_1",
			),
			HmiWidget.create(
				"rectangle",
				0,
				0,
				undefined,
				undefined,
				0,
				"Rectangle_2",
			),
		];
		expect(HmiWidget.nextName("rectangle", widgets)).toBe("Rectangle_3");
	});

	it("ignore les trous de numérotation (widget renommé/supprimé)", () => {
		const widgets = [
			HmiWidget.create(
				"rectangle",
				0,
				0,
				undefined,
				undefined,
				0,
				"Rectangle_2",
			),
		];
		expect(HmiWidget.nextName("rectangle", widgets)).toBe("Rectangle_1");
	});

	it("ne considère que les widgets du même type pour la numérotation", () => {
		const widgets = [
			HmiWidget.create("ellipse", 0, 0, undefined, undefined, 0, "Ellipse_1"),
		];
		expect(HmiWidget.nextName("rectangle", widgets)).toBe("Rectangle_1");
	});
});

describe("HmiWidget.create - name", () => {
	it("utilise Label_1 par défaut", () => {
		const w = HmiWidget.create("gauge", 0, 0);
		expect(w.name).toBe("Jauge_1");
	});

	it("utilise le nom fourni", () => {
		const w = HmiWidget.create(
			"gauge",
			0,
			0,
			undefined,
			undefined,
			0,
			"Ma jauge",
		);
		expect(w.name).toBe("Ma jauge");
	});
});

describe("HmiWidget.getResizeAspectRatio", () => {
	it("retourne le ratio fixé par le type (ex. indicator)", () => {
		const w = HmiWidget.create("indicator", 0, 0);
		expect(HmiWidget.getResizeAspectRatio(w)).toBe(1);
	});

	it("retourne undefined pour un widget non verrouillé", () => {
		const w = HmiWidget.create("ellipse", 0, 0);
		expect(HmiWidget.getResizeAspectRatio(w)).toBeUndefined();
	});

	it("fige le ratio courant quand lockAspectRatio est vrai", () => {
		const w = HmiWidget.create("rectangle", 0, 0, { width: 120, height: 80 }, {
			lockAspectRatio: true,
		});
		expect(HmiWidget.getResizeAspectRatio(w)).toBeCloseTo(1.5);
	});

	it("donne 1 pour un widget carré verrouillé (cercle via l'outil palette)", () => {
		const w = HmiWidget.create("ellipse", 0, 0, { width: 40, height: 40 }, {
			lockAspectRatio: true,
		});
		expect(HmiWidget.getResizeAspectRatio(w)).toBe(1);
	});

	it("le ratio imposé par le type l'emporte sur lockAspectRatio", () => {
		const w = HmiWidget.create("indicator", 0, 0, { width: 40, height: 40 }, {
			lockAspectRatio: true,
		});
		expect(HmiWidget.getResizeAspectRatio(w)).toBe(1);
	});
});

describe("HmiWidget.copy", () => {
	it("produit une copie indépendante", () => {
		const w = HmiWidget.create("gauge", 10, 20);
		if (w.type !== "gauge") throw new Error("unreachable");
		w.data.label = "Test";
		w.data.min = 5;
		w.data.max = 200;
		const copy = w.copy();
		copy.data.label = "Modifié";
		copy.data.min = 99;
		expect(w.data.label).toBe("Test");
		expect(w.data.min).toBe(5);
	});

	it("la taille copiée est indépendante de l'originale", () => {
		const w = HmiWidget.create("gauge", 10, 20);
		const copy = w.copy();
		copy.size.width = 999;
		expect(w.size.width).toBe(HMI_WIDGET_DEFINITIONS.gauge.defaultSize.width);
	});
});

describe("HmiWidget.createFromJSON", () => {
	it("reconstruit un widget depuis JSON avec les champs optionnels", () => {
		const original = HmiWidget.create("gauge", 10, 20);
		if (original.type !== "gauge") throw new Error("unreachable");
		original.data.min = 5;
		original.data.max = 200;
		original.data.label = "Vitesse";
		original.size = { width: 150, height: 110 };
		const json = JSON.stringify(original);
		const restored = HmiWidget.createFromJSON(json);
		expect(restored.id).toBe(original.id);
		expect(restored.type).toBe("gauge");
		if (restored.type !== "gauge") throw new Error("unreachable");
		expect(restored.data.min).toBe(5);
		expect(restored.data.max).toBe(200);
		expect(restored.data.label).toBe("Vitesse");
		expect(restored.size).toEqual({ width: 150, height: 110 });
	});

	it("tolère un JSON sans position ni data", () => {
		const raw = JSON.stringify({ id: "x", type: "indicator" });
		const w = HmiWidget.createFromJSON(raw);
		if (w.type !== "indicator") throw new Error("unreachable");
		expect(w.position).toEqual({ x: 0, y: 0 });
		expect(w.data.variable).toBe("");
	});

	// Un projet sauvegardé avant l'ajout du redimensionnement n'a pas de champ `size`.
	it("retombe sur la taille par défaut du type quand size est absent", () => {
		const raw = JSON.stringify({ id: "x", type: "push-button" });
		const w = HmiWidget.createFromJSON(raw);
		expect(w.size).toEqual(HMI_WIDGET_DEFINITIONS["push-button"].defaultSize);
	});
});

describe("HMI_WIDGET_DEFINITIONS", () => {
	it("définit une taille par défaut positive pour chaque type", () => {
		ALL_TYPES.forEach((type) => {
			const { defaultSize } = HMI_WIDGET_DEFINITIONS[type];
			expect(defaultSize.width).toBeGreaterThan(0);
			expect(defaultSize.height).toBeGreaterThan(0);
		});
	});

	// gauge n'a pas de taille minimale unique : son orientation peut varier (voir
	// `HmiWidgetPropertiesPanel`), `useHmiWidgetResize` retombe alors sur un plancher générique.
	it("définit une taille minimale pour chaque type sauf gauge", () => {
		ALL_TYPES.forEach((type) => {
			const { minSize } = HMI_WIDGET_DEFINITIONS[type];
			if (type === "gauge") {
				expect(minSize).toBeUndefined();
				return;
			}
			expect(minSize).toBeDefined();
			expect(minSize!.width).toBeGreaterThan(0);
			expect(minSize!.height).toBeGreaterThan(0);
		});
	});

	it("la taille par défaut ne descend jamais sous la taille minimale", () => {
		ALL_TYPES.forEach((type) => {
			const { defaultSize, minSize } = HMI_WIDGET_DEFINITIONS[type];
			if (!minSize) return;
			expect(defaultSize.width).toBeGreaterThanOrEqual(minSize.width);
			expect(defaultSize.height).toBeGreaterThanOrEqual(minSize.height);
		});
	});

	it("un widget avec aspectRatio a une taille par défaut et minimale cohérentes avec ce ratio", () => {
		ALL_TYPES.forEach((type) => {
			const { defaultSize, minSize, aspectRatio } =
				HMI_WIDGET_DEFINITIONS[type];
			if (aspectRatio === undefined || !minSize) return;
			expect(defaultSize.width / defaultSize.height).toBeCloseTo(aspectRatio);
			expect(minSize.width / minSize.height).toBeCloseTo(aspectRatio);
		});
	});

	it("les widgets booléens ne lient que des variables BOOL", () => {
		(["push-button", "indicator", "toggle-switch"] as HmiWidgetType[]).forEach(
			(type) => {
				expect(HMI_WIDGET_DEFINITIONS[type].variableBinding?.types).toEqual([
					"BOOL",
				]);
			},
		);
	});

	it("les widgets numériques ne lient pas de variable BOOL", () => {
		(["numeric-display", "gauge", "numeric-input"] as HmiWidgetType[]).forEach(
			(type) => {
				const types = HMI_WIDGET_DEFINITIONS[type].variableBinding?.types ?? [];
				expect(types).not.toContain("BOOL");
				expect(types.length).toBeGreaterThan(0);
			},
		);
	});

	it("les formes n'ont pas de liaison à une variable", () => {
		(["rectangle", "ellipse", "text"] as HmiWidgetType[]).forEach((type) => {
			expect(HMI_WIDGET_DEFINITIONS[type].variableBinding).toBeNull();
		});
	});

	const ALL_9: HmiWidgetType[] = [
		...ALL_TYPES,
		"rectangle",
		"ellipse",
		"text",
	];

	it("kind cohérent avec variableBinding (shape => null, interactive => liaison non vide)", () => {
		ALL_9.forEach((type) => {
			const def = HMI_WIDGET_DEFINITIONS[type];
			if (def.kind === "shape") {
				expect(def.variableBinding).toBeNull();
			} else {
				expect(def.variableBinding?.types.length ?? 0).toBeGreaterThan(0);
			}
		});
	});

	it("une forme n'a pas de variable dans ses données par défaut", () => {
		ALL_9.forEach((type) => {
			const def = HMI_WIDGET_DEFINITIONS[type];
			if (def.kind === "shape") {
				expect("variable" in def.defaultData).toBe(false);
			} else {
				expect("variable" in def.defaultData).toBe(true);
			}
		});
	});

	it("seuls le bouton, l'interrupteur et la saisie écrivent dans leur variable", () => {
		const writers = ALL_9.filter(
			(t) => HMI_WIDGET_DEFINITIONS[t].variableBinding?.writes,
		);
		expect(writers.sort()).toEqual(
			["numeric-input", "push-button", "toggle-switch"].sort(),
		);
	});
});
