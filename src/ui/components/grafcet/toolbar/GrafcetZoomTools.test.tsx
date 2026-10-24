/**
 * @jest-environment jsdom
 */
import { Dialect } from "@/expression-language/dialect.enum";
import CommandsStack from "@/schemas/commands/commands-stack.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { createGrafcetStore } from "@/ui/stores/grafcet/grafcet.store";
import { act, fireEvent, screen } from "@testing-library/react";
import { useStore } from "zustand";
import { renderWithI18n } from "@tests/utils/i18n";
import {
	GRAFCET_FLOW_MAX_ZOOM,
	GRAFCET_FLOW_MIN_ZOOM,
} from "@/ui/stores/grafcet/managers/view.manager";
import { useGrafcetStore } from "../context/GrafcetContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import GrafcetZoomTools from "./GrafcetZoomTools";

jest.mock("../context/GrafcetContext");

function setup(
	zoom: number | null,
	{
		minZoom = GRAFCET_FLOW_MIN_ZOOM,
		zoomIn = jest.fn(),
		zoomOut = jest.fn(),
	} = {},
) {
	(useGrafcetStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ zoom, minZoom, viewManager: { zoomIn, zoomOut } }),
	);
	renderWithI18n(<GrafcetZoomTools />);
	return { zoomIn, zoomOut };
}

const zoomInTool = () =>
	document.querySelector(".app-toolbar__zoom-in") as HTMLElement;
const zoomOutTool = () =>
	document.querySelector(".app-toolbar__zoom-out") as HTMLElement;

function renderWithRealStore(zoom: number) {
	const store = createGrafcetStore(
		new Grafcet("g", "G"),
		new CommandsStack<Grafcet>(10),
		() => Dialect.FR,
	);
	store.getState().viewManager.setZoom(zoom);
	(useGrafcetStore as unknown as jest.Mock).mockImplementation((selector) =>
		useStore(store, selector),
	);
	renderWithI18n(<GrafcetZoomTools />);
	return store;
}

describe("GrafcetZoomTools", () => {
	it("affiche le niveau de zoom entre Dézoomer et Zoomer", () => {
		setup(1.5);

		const level = screen.getByText("150%");
		expect(zoomOutTool().compareDocumentPosition(level)).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING,
		);
		expect(level.compareDocumentPosition(zoomInTool())).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING,
		);
	});

	it("n'affiche pas de niveau tant que le zoom n'est pas connu", () => {
		setup(null);
		expect(screen.queryByText(/%/)).not.toBeInTheDocument();
	});

	describe("zoom avant", () => {
		it("se désactive au zoom maximum", () => {
			setup(GRAFCET_FLOW_MAX_ZOOM);
			expect(zoomInTool()).toHaveAttribute("aria-disabled", "true");
		});

		it("reste actif en-dessous du zoom maximum, et zoome au clic", () => {
			const { zoomIn } = setup(GRAFCET_FLOW_MAX_ZOOM - 0.5);
			expect(zoomInTool()).toHaveAttribute("aria-disabled", "false");

			fireEvent.click(zoomInTool());

			expect(zoomIn).toHaveBeenCalled();
		});

		it("se réactive quand le zoom du store redescend sous le maximum", () => {
			const store = renderWithRealStore(GRAFCET_FLOW_MAX_ZOOM);
			expect(zoomInTool()).toHaveAttribute("aria-disabled", "true");

			act(() => store.getState().viewManager.setZoom(1));

			expect(zoomInTool()).toHaveAttribute("aria-disabled", "false");
		});

		it("se désactive tant que le zoom n'est pas connu", () => {
			setup(null);
			expect(zoomInTool()).toHaveAttribute("aria-disabled", "true");
		});
	});

	describe("zoom arrière", () => {
		it("se désactive au zoom minimum", () => {
			setup(GRAFCET_FLOW_MIN_ZOOM);
			expect(zoomOutTool()).toHaveAttribute("aria-disabled", "true");
		});

		it("reste actif au-dessus du zoom minimum, et dézoome au clic", () => {
			const { zoomOut } = setup(GRAFCET_FLOW_MIN_ZOOM + 0.5);
			expect(zoomOutTool()).toHaveAttribute("aria-disabled", "false");

			fireEvent.click(zoomOutTool());

			expect(zoomOut).toHaveBeenCalled();
		});

		it("reste actif sous le zoom minimal de la page quand le flow en admet un plus bas", () => {
			setup(0.6, { minZoom: 0.2 });
			expect(zoomOutTool()).toHaveAttribute("aria-disabled", "false");
		});

		it("se désactive au zoom minimal du flow", () => {
			setup(0.2, { minZoom: 0.2 });
			expect(zoomOutTool()).toHaveAttribute("aria-disabled", "true");
		});

		it("se réactive quand le zoom du store remonte au-dessus du minimum", () => {
			const store = renderWithRealStore(GRAFCET_FLOW_MIN_ZOOM);
			expect(zoomOutTool()).toHaveAttribute("aria-disabled", "true");

			act(() => store.getState().viewManager.setZoom(2));

			expect(zoomOutTool()).toHaveAttribute("aria-disabled", "false");
		});

		it("se désactive tant que le zoom n'est pas connu", () => {
			setup(null);
			expect(zoomOutTool()).toHaveAttribute("aria-disabled", "true");
		});
	});
});
