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

	it("le champ Orientation de la jauge échange largeur et hauteur", () => {
		const orientation = HMI_WIDGET_UI.gauge.propertyFields.find(
			(f) => f.kind === "select" && f.label === "Orientation",
		);
		if (!orientation || orientation.kind !== "select" || !orientation.widgetPatch)
			throw new Error("champ orientation introuvable");
		const patch = orientation.widgetPatch(
			{ size: { width: 120, height: 40 } } as never,
			"vertical",
		);
		expect(patch.size).toEqual({ width: 40, height: 120 });
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
