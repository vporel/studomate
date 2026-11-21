/**
 * @jest-environment jsdom
 */
import type { Locale } from "@/i18n/config";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import HmiObjectsPanel from "./HmiObjectsPanel";

jest.mock("@/ui/components/hmi/HmiContext");

const widget = (id: string, name: string, stackOrder: number) => ({
	id,
	name,
	type: "rectangle",
	stackOrder,
});

function setup(
	widgets: Record<string, ReturnType<typeof widget>>,
	{ selected = [] as string[], locale = "fr" as Locale } = {},
) {
	const selectWidget = jest.fn();
	(useHmiStore as jest.Mock).mockImplementation(
		selectorImplementation({
			hmiPage: { widgets },
			selectedWidgetIds: selected,
			selectWidget,
		}),
	);
	renderWithI18n(<HmiObjectsPanel />, { locale });
	return { selectWidget };
}

describe("HmiObjectsPanel", () => {
	it.each([
		["fr", "Aucun objet."],
		["en", "No objects."],
		["es", "Ningún objeto."],
	] as [Locale, string][])(
		"words the empty state in %s",
		(locale, expected) => {
			setup({}, { locale });

			expect(screen.getByText(expected)).toBeInTheDocument();
		},
	);

	it("lists the widgets from the top of the stack to the bottom", () => {
		setup({
			a: widget("a", "Bas", 0),
			b: widget("b", "Haut", 2),
			c: widget("c", "Milieu", 1),
		});

		expect(
			screen.getAllByText(/Bas|Haut|Milieu/).map((el) => el.textContent),
		).toEqual(["Haut", "Milieu", "Bas"]);
	});

	it("selects the widget that is clicked", () => {
		const { selectWidget } = setup({ a: widget("a", "Rectangle", 0) });

		fireEvent.click(screen.getByText("Rectangle"));

		expect(selectWidget).toHaveBeenCalledWith("a");
	});
});
