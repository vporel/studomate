import {
	HMI_WIDGET_DEFINITIONS,
	HmiWidgetType,
} from "@/schemas/hmi/hmi-widget.schema";
import { HMI_WIDGET_UI } from "./hmi-widget-ui";

const ALL_TYPES = Object.keys(HMI_WIDGET_DEFINITIONS) as HmiWidgetType[];

describe("HMI_WIDGET_UI", () => {
	it("a une entrée avec un composant pour chaque type de widget", () => {
		ALL_TYPES.forEach((type) => {
			expect(HMI_WIDGET_UI[type]).toBeDefined();
			expect(HMI_WIDGET_UI[type].component).toBeDefined();
		});
	});

	it("paletteOrder est unique au sein de chaque groupe (kind)", () => {
		(["interactive", "shape"] as const).forEach((kind) => {
			const orders = ALL_TYPES.filter(
				(t) => HMI_WIDGET_DEFINITIONS[t].kind === kind,
			).map((t) => HMI_WIDGET_UI[t].paletteOrder);
			expect(new Set(orders).size).toBe(orders.length);
		});
	});

	it("previewValue est booléen pour les widgets BOOL, numérique sinon", () => {
		ALL_TYPES.forEach((type) => {
			const types = HMI_WIDGET_DEFINITIONS[type].variableBinding?.types ?? [];
			if (types.length === 1 && types[0] === "BOOL") {
				expect(typeof HMI_WIDGET_UI[type].previewValue).toBe("boolean");
			}
		});
	});
});

describe("descripteurs de champs (propertyFields)", () => {
	it("get/set font un aller-retour sans perte sur les données par défaut", () => {
		ALL_TYPES.forEach((type) => {
			const fields = HMI_WIDGET_UI[type].propertyFields as {
				get: (d: unknown) => unknown;
				set: (d: unknown, v: unknown) => unknown;
			}[];
			const defaultData = HMI_WIDGET_DEFINITIONS[type].defaultData;
			fields.forEach((field) => {
				const current = field.get(defaultData);
				const next = field.set(defaultData, current) as object;
				expect(field.get(next)).toEqual(current);
			});
		});
	});

	it("set ne mute pas les données passées", () => {
		ALL_TYPES.forEach((type) => {
			const fields = HMI_WIDGET_UI[type].propertyFields as {
				get: (d: unknown) => unknown;
				set: (d: unknown, v: unknown) => unknown;
			}[];
			const defaultData = HMI_WIDGET_DEFINITIONS[type].defaultData;
			fields.forEach((field) => {
				const snapshot = JSON.stringify(defaultData);
				field.set(defaultData, field.get(defaultData));
				expect(JSON.stringify(defaultData)).toBe(snapshot);
			});
		});
	});

	it("les champs Gras/Italique du texte basculent style.bold / style.italic", () => {
		(["fields.bold", "fields.italic"] as const).forEach((label) => {
			const field = HMI_WIDGET_UI.text.propertyFields.find(
				(f) => f.kind === "checkbox" && f.label === label,
			);
			if (!field || field.kind !== "checkbox")
				throw new Error(`champ ${label} introuvable`);
			const data = HMI_WIDGET_DEFINITIONS.text.defaultData as Extract<
				typeof HMI_WIDGET_DEFINITIONS.text.defaultData,
				{ text: string }
			>;
			expect(field.get(data)).toBe(false);
			const next = field.set(data, true);
			expect(field.get(next)).toBe(true);
			expect(next.style?.fontSize).toBe(14);
		});
	});

	it("le champ Orientation de la jauge échange largeur et hauteur", () => {
		const orientation = HMI_WIDGET_UI.gauge.propertyFields.find(
			(f) => f.kind === "select" && f.label === "fields.orientation",
		);
		if (!orientation || orientation.kind !== "select" || !orientation.widgetPatch)
			throw new Error("champ orientation introuvable");
		const patch = orientation.widgetPatch(
			{ size: { width: 120, height: 40 } } as never,
			"vertical",
		);
		expect(patch.size).toEqual({ width: 40, height: 120 });
	});

	it("le champ Orientation du trait échange largeur et hauteur", () => {
		const orientation = HMI_WIDGET_UI.line.propertyFields.find(
			(f) => f.kind === "select" && f.label === "fields.orientation",
		);
		if (!orientation || orientation.kind !== "select" || !orientation.widgetPatch)
			throw new Error("champ orientation introuvable");
		const patch = orientation.widgetPatch(
			{ size: { width: 120, height: 2 } } as never,
			"vertical",
		);
		expect(patch.size).toEqual({ width: 2, height: 120 });
	});

	it("le champ Orientation du curseur échange largeur et hauteur", () => {
		const orientation = HMI_WIDGET_UI.slider.propertyFields.find(
			(f) => f.kind === "select" && f.label === "fields.orientation",
		);
		if (!orientation || orientation.kind !== "select" || !orientation.widgetPatch)
			throw new Error("champ orientation introuvable");
		const patch = orientation.widgetPatch(
			{ size: { width: 160, height: 40 } } as never,
			"vertical",
		);
		expect(patch.size).toEqual({ width: 40, height: 160 });
	});

	it("les bornes du curseur sont imposables par le comportement de la variable, pas son pas", () => {
		const imposable = HMI_WIDGET_UI.slider.propertyFields
			.filter((f) => f.kind === "number" && f.imposedByInputBehavior)
			.map((f) => f.label);
		expect(imposable).toEqual(["fields.min", "fields.max"]);
	});
});

describe("animatableStyleProps", () => {
	it("staticValue lit une chaîne présente dans les données par défaut", () => {
		ALL_TYPES.forEach((type) => {
			const props = HMI_WIDGET_UI[type].animatableStyleProps as {
				staticValue: (d: unknown) => string;
			}[];
			props.forEach((prop) => {
				expect(typeof prop.staticValue(HMI_WIDGET_DEFINITIONS[type].defaultData)).toBe(
					"string",
				);
			});
		});
	});

	it("seules les formes ont des propriétés de style animables", () => {
		ALL_TYPES.forEach((type) => {
			const hasStyleProps = HMI_WIDGET_UI[type].animatableStyleProps.length > 0;
			if (hasStyleProps) {
				expect(HMI_WIDGET_DEFINITIONS[type].kind).toBe("shape");
			}
		});
	});
});

type AnyField = {
	kind: string;
	label: string;
	min?: number;
	imposedByInputBehavior?: boolean;
	get: (d: unknown) => unknown;
	set: (d: unknown, v: unknown) => unknown;
	widgetPatch?: (w: unknown, v: string) => unknown;
};

const fieldsOf = (type: HmiWidgetType) =>
	HMI_WIDGET_UI[type].propertyFields as unknown as AnyField[];
const findField = (type: HmiWidgetType, label: string) =>
	fieldsOf(type).find((f) => f.label === label)!;
const defaults = (type: HmiWidgetType) =>
	HMI_WIDGET_DEFINITIONS[type].defaultData;

describe("champ d'orientation partagé", () => {
	it.each(["gauge", "slider", "line"] as const)(
		"%s : lit horizontal par défaut, écrit vertical, et échange largeur/hauteur",
		(type) => {
			const field = findField(type, "fields.orientation");

			expect(field.get(defaults(type))).toBe("horizontal");
			expect(field.get(field.set(defaults(type), "vertical"))).toBe("vertical");
			expect(
				field.widgetPatch!({ size: { width: 200, height: 30 } }, "vertical"),
			).toEqual({ size: { width: 30, height: 200 } });
		},
	);

	it("lit horizontal quand le style est absent", () => {
		const field = findField("gauge", "fields.orientation");

		expect(field.get({ variable: "v", label: "" })).toBe("horizontal");
	});
});

describe("champs min/max partagés", () => {
	it.each(["gauge", "numeric-input", "slider"] as const)(
		"%s : défauts 0 et 100, et écriture des bornes",
		(type) => {
			const min = findField(type, "fields.min");
			const max = findField(type, "fields.max");

			expect(min.get({})).toBe(0);
			expect(max.get({})).toBe(100);
			expect(min.get(min.set({}, 5))).toBe(5);
			expect(max.get(max.set({}, 50))).toBe(50);
		},
	);

	it("seuls numeric-input et slider imposent leurs bornes par le comportement", () => {
		expect(findField("gauge", "fields.min").imposedByInputBehavior).toBeFalsy();
		expect(findField("gauge", "fields.max").imposedByInputBehavior).toBeFalsy();
		for (const type of ["numeric-input", "slider"] as const) {
			expect(findField(type, "fields.min").imposedByInputBehavior).toBe(true);
			expect(findField(type, "fields.max").imposedByInputBehavior).toBe(true);
		}
	});
});

describe("champs fill/stroke partagés", () => {
	it.each(["rectangle", "ellipse"] as const)(
		"%s : lit et écrit fill, stroke et strokeWidth",
		(type) => {
			const fill = findField(type, "fields.fill");
			const stroke = findField(type, "fields.stroke");
			const width = findField(type, "fields.strokeWidth");

			expect(fill.get(fill.set(defaults(type), "#111111"))).toBe("#111111");
			expect(stroke.get(stroke.set(defaults(type), "#222222"))).toBe("#222222");
			expect(width.get(width.set(defaults(type), 4))).toBe(4);
			expect(width.min).toBe(0);
			expect(width.get({ style: { fill: "", stroke: "" } })).toBe(0);
		},
	);

	it.each(["rectangle", "ellipse"] as const)(
		"%s : staticValue des styles animables lit fill et stroke",
		(type) => {
			const props = HMI_WIDGET_UI[type].animatableStyleProps as unknown as {
				name: string;
				inputType: string;
				staticValue: (d: unknown) => string;
			}[];
			const data = { style: { fill: "#aaa", stroke: "#bbb" } };

			expect(props.map((p) => p.name)).toEqual(["fill", "stroke"]);
			expect(props.map((p) => p.inputType)).toEqual(["color", "color"]);
			expect(props.map((p) => p.staticValue(data))).toEqual(["#aaa", "#bbb"]);
		},
	);

	it("rectangle garde son rayon de bordure, pas ellipse", () => {
		expect(fieldsOf("rectangle").map((f) => f.label)).toContain(
			"fields.borderRadius",
		);
		expect(fieldsOf("ellipse").map((f) => f.label)).not.toContain(
			"fields.borderRadius",
		);
	});
});
