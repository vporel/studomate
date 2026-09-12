/**
 * @jest-environment jsdom
 */
import { screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import {
	HMI_WIDGET_DEFINITIONS,
	HmiWidgetType,
} from "@/schemas/hmi/hmi-widget.schema";
import HmiSection from "./HmiSection";

describe("HmiSection", () => {
	it("annonce le nombre exact de types de widgets défini par le domaine", () => {
		const count = Object.keys(HMI_WIDGET_DEFINITIONS).length;
		renderWithI18n(<HmiSection selected="hmi-widgets" />);
		expect(
			screen.getByText(
				`${count} types de widgets sont disponibles, répartis en deux groupes dans la palette.`,
			),
		).toBeInTheDocument();
	});

	it("liste une description de manuel par widget (résolue depuis hmiEditor.widgetManual)", () => {
		renderWithI18n(<HmiSection selected="hmi-widgets" />);
		const items = screen.getAllByRole("listitem");
		expect(items.length).toBe(
			(Object.keys(HMI_WIDGET_DEFINITIONS) as HmiWidgetType[]).length,
		);
		// Un extrait d'une description connue, pour vérifier la résolution i18n.
		expect(screen.getByText(/Bouton poussoir —/)).toBeInTheDocument();
	});
});
