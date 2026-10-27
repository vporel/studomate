/**
 * @jest-environment jsdom
 */
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import HmiWidgetEventsPane from "./HmiWidgetEventsPane";

jest.mock("@/ui/components/hmi/HmiContext");
jest.mock("./HmiWidgetEventsPanel", () => ({
	__esModule: true,
	default: () => <span>liste des événements</span>,
}));

const widget = { id: "w1", name: "Bouton" } as HmiWidget;

function setup(visible: boolean, readOnly = false) {
	const closeEventsPane = jest.fn();
	(useHmiStore as jest.Mock).mockImplementation(
		selectorImplementation({ eventsPaneVisible: visible, closeEventsPane }),
	);
	renderWithI18n(<HmiWidgetEventsPane widget={widget} readOnly={readOnly} />);
	return { closeEventsPane };
}

describe("HmiWidgetEventsPane", () => {
	it("n'affiche rien tant que le volet n'est pas ouvert", () => {
		setup(false);

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("affiche les événements du widget dans une boîte intitulée par son nom", () => {
		setup(true);

		expect(screen.getByRole("dialog")).toHaveTextContent("Bouton");
		expect(screen.getByText("liste des événements")).toBeInTheDocument();
	});

	it("se ferme par le bouton de fermeture", () => {
		const { closeEventsPane } = setup(true);

		fireEvent.click(screen.getByRole("button", { name: "Fermer" }));

		expect(closeEventsPane).toHaveBeenCalledTimes(1);
	});

	it("rend la liste inerte en lecture seule", () => {
		setup(true, true);

		expect(
			screen.getByText("liste des événements").parentElement,
		).toHaveAttribute("inert");
	});
});
