/** @jest-environment jsdom */
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import HmiWidgetEventsPanel from "./HmiWidgetEventsPanel";

jest.mock("@/ui/components/hmi/HmiContext");
jest.mock("@/ui/components/projects/ProjectContext");

const pages = {
	p1: { id: "p1", name: "Accueil" },
	p2: { id: "p2", name: "Réglages" },
};

const pushButton = (events?: object) =>
	({
		id: "w1",
		type: "push-button",
		name: "Bouton",
		data: { variable: "v", ...(events ? { events } : {}) },
	}) as unknown as HmiWidget;

function setup(widget: HmiWidget, hmiPages: object | undefined = pages) {
	const updateWidget = jest.fn();
	(useHmiStore as jest.Mock).mockImplementation(
		selectorImplementation({ updateWidget }),
	);
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			project: hmiPages ? { hmiPages } : undefined,
		}),
	);
	const { container } = renderWithI18n(
		<HmiWidgetEventsPanel widget={widget} />,
	);
	return { updateWidget, container };
}

describe("HmiWidgetEventsPanel", () => {
	it("n'affiche rien pour un widget sans événement", () => {
		const { container } = setup({
			id: "w2",
			type: "rectangle",
			name: "R",
			data: {},
		} as unknown as HmiWidget);

		expect(container).toBeEmptyDOMElement();
	});

	it("affiche l'événement sans action et le bouton d'ajout", () => {
		setup(pushButton());

		expect(screen.getByText("Bouton pressé")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Supprimer l'action" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Ajouter une action/ }),
		).toBeInTheDocument();
	});

	it("ajoute une action de navigation vers la première page", () => {
		const { updateWidget } = setup(pushButton());

		fireEvent.click(screen.getByRole("button", { name: /Ajouter une action/ }));

		expect(updateWidget).toHaveBeenCalledWith("w1", {
			data: {
				variable: "v",
				events: {
					onPress: [{ type: "navigate-to-page", targetHmiPageId: "p1" }],
				},
			},
		});
	});

	it("ajoute une action avec une page cible vide si le projet n'a pas de page", () => {
		const { updateWidget } = setup(pushButton(), {});

		fireEvent.click(screen.getByRole("button", { name: /Ajouter une action/ }));

		expect(updateWidget.mock.calls[0][1].data.events.onPress).toEqual([
			{ type: "navigate-to-page", targetHmiPageId: "" },
		]);
	});

	it("ajoute à la suite des actions existantes", () => {
		const { updateWidget } = setup(
			pushButton({
				onPress: [{ type: "navigate-to-page", targetHmiPageId: "p2" }],
			}),
		);

		fireEvent.click(screen.getByRole("button", { name: /Ajouter une action/ }));

		expect(updateWidget.mock.calls[0][1].data.events.onPress).toEqual([
			{ type: "navigate-to-page", targetHmiPageId: "p2" },
			{ type: "navigate-to-page", targetHmiPageId: "p1" },
		]);
	});

	it("affiche une ligne par action avec la page cible", () => {
		setup(
			pushButton({
				onPress: [
					{ type: "navigate-to-page", targetHmiPageId: "p2" },
					{ type: "navigate-to-page", targetHmiPageId: "p1" },
				],
			}),
		);

		expect(
			screen.getAllByRole("button", { name: "Supprimer l'action" }),
		).toHaveLength(2);
		expect(screen.getByText("Réglages")).toBeInTheDocument();
		expect(screen.getByText("Accueil")).toBeInTheDocument();
	});

	it("supprime l'action choisie en conservant les autres", () => {
		const { updateWidget } = setup(
			pushButton({
				onPress: [
					{ type: "navigate-to-page", targetHmiPageId: "p2" },
					{ type: "navigate-to-page", targetHmiPageId: "p1" },
				],
			}),
		);

		fireEvent.click(
			screen.getAllByRole("button", { name: "Supprimer l'action" })[0],
		);

		expect(updateWidget.mock.calls[0][1].data.events.onPress).toEqual([
			{ type: "navigate-to-page", targetHmiPageId: "p1" },
		]);
	});

	it("modifie la page cible d'une action", () => {
		const { updateWidget } = setup(
			pushButton({
				onPress: [{ type: "navigate-to-page", targetHmiPageId: "p1" }],
			}),
		);

		const targetSelect = screen.getByRole("combobox", { name: "Page cible" });
		fireEvent.mouseDown(targetSelect);
		const listbox = within(screen.getByRole("listbox"));
		fireEvent.click(listbox.getByText("Réglages"));

		expect(updateWidget.mock.calls[0][1].data.events.onPress).toEqual([
			{ type: "navigate-to-page", targetHmiPageId: "p2" },
		]);
	});

	it("affiche le type d'action courant", () => {
		setup(
			pushButton({
				onPress: [{ type: "navigate-to-page", targetHmiPageId: "p2" }],
			}),
		);

		expect(screen.getAllByRole("combobox")[0]).toHaveTextContent(
			"Changer de page",
		);
	});
});
