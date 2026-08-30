import { HmiWidgetPropertyField } from "@/ui/components/hmi/widgets/hmi-widget-ui";
import { groupPropertyFields } from "./HmiWidgetPropertyFields";

const field = (
	kind: HmiWidgetPropertyField<unknown>["kind"],
	label: string,
): HmiWidgetPropertyField<unknown> =>
	({ kind, label, get: () => undefined, set: (d: unknown) => d }) as unknown as HmiWidgetPropertyField<unknown>;

describe("groupPropertyFields", () => {
	it("apparie deux champs couleur qui se suivent", () => {
		const groups = groupPropertyFields([
			field("color", "Remplissage"),
			field("color", "Contour"),
			field("number", "Épaisseur du contour"),
		]);
		expect(groups).toHaveLength(2);
		expect(Array.isArray(groups[0])).toBe(true);
		expect((groups[0] as HmiWidgetPropertyField<unknown>[]).map((f) => f.label)).toEqual([
			"Remplissage",
			"Contour",
		]);
		expect(groups[1]).toMatchObject({ label: "Épaisseur du contour" });
	});

	it("laisse seul un champ couleur isolé", () => {
		const groups = groupPropertyFields([
			field("text", "Texte"),
			field("color", "Remplissage"),
		]);
		expect(groups.map((g) => (Array.isArray(g) ? "pair" : g.kind))).toEqual([
			"text",
			"color",
		]);
	});

	it("n'apparie pas au-delà de deux : trois couleurs -> une paire + une seule", () => {
		const groups = groupPropertyFields([
			field("color", "A"),
			field("color", "B"),
			field("color", "C"),
		]);
		expect(groups).toHaveLength(2);
		expect(Array.isArray(groups[0])).toBe(true);
		expect(Array.isArray(groups[1])).toBe(false);
	});
});
