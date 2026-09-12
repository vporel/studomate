import HmiPage from "@/schemas/hmi/hmi-page.schema";
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import collectHmiReferences from "./hmi-references";
import { RawReference } from "./cross-reference.types";

function pageWith(...widgets: HmiWidget[]): HmiPage {
	const page = new HmiPage("hmi-1", "Vue HMI");
	widgets.forEach((widget) => page.addWidget(widget));
	return page;
}

function find(refs: RawReference[], variableName: string): RawReference[] {
	return refs.filter((ref) => ref.variableName === variableName);
}

describe("collectHmiReferences", () => {
	it("lit la variable d'un widget d'affichage, écrit celle d'un widget interactif", () => {
		const refs = collectHmiReferences(
			pageWith(
				HmiWidget.create("indicator", 0, 0, undefined, { variable: "Voyant" }),
				HmiWidget.create("push-button", 0, 0, undefined, { variable: "Marche" }),
				HmiWidget.create("numeric-input", 0, 0, undefined, { variable: "Consigne" }),
			),
		);
		expect(find(refs, "Voyant")[0]).toMatchObject({
			access: "read",
			locationKind: "hmi-widget-binding",
			programType: "hmi",
		});
		expect(find(refs, "Marche")[0].access).toBe("write");
		expect(find(refs, "Consigne")[0].access).toBe("write");
	});

	it("ignore un widget forme et un widget interactif sans variable", () => {
		const refs = collectHmiReferences(
			pageWith(
				HmiWidget.create("rectangle", 0, 0),
				HmiWidget.create("indicator", 0, 0),
			),
		);
		expect(refs).toEqual([]);
	});

	it("lit les variables d'animation (position, style)", () => {
		const refs = collectHmiReferences(
			pageWith(
				HmiWidget.create("indicator", 0, 0, undefined, {
					variable: "Actif",
					animations: {
						position: { xVariable: "DecalX" },
						style: { variable: "Niveau", rows: [] },
					},
				}),
			),
		);
		expect(find(refs, "DecalX")[0]).toMatchObject({
			access: "read",
			locationKind: "hmi-widget-animation",
		});
		expect(find(refs, "Niveau")[0].access).toBe("read");
	});

	it("porte le nom et le type du widget dans locationParams", () => {
		const [ref] = collectHmiReferences(
			pageWith(
				HmiWidget.create("gauge", 0, 0, undefined, { variable: "Debit" }, 0, "Jauge_1"),
			),
		);
		expect(ref.locationParams).toMatchObject({
			widgetName: "Jauge_1",
			widgetType: "gauge",
		});
	});
});
