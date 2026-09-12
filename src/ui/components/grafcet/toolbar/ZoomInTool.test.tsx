/**
 * @jest-environment jsdom
 */
import { fireEvent } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { GRAFCET_FLOW_MAX_ZOOM } from "@/ui/stores/grafcet/managers/view.manager";
import { useGrafcetStore } from "../context/GrafcetContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import ZoomInTool from "./ZoomInTool";

jest.mock("../context/GrafcetContext");

function setup(zoom: number | null, zoomIn = jest.fn()) {
	(useGrafcetStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ viewManager: { getZoom: () => zoom, zoomIn } }),
	);
	renderWithI18n(<ZoomInTool />);
	return { zoomIn };
}

function tool(): HTMLElement {
	return document.querySelector(".app-toolbar__zoom-in") as HTMLElement;
}

describe("ZoomInTool", () => {
	it("se désactive au zoom maximum", () => {
		setup(GRAFCET_FLOW_MAX_ZOOM);
		expect(tool()).toHaveAttribute("aria-disabled", "true");
	});

	it("reste actif en-dessous du zoom maximum, et zoome au clic", () => {
		const { zoomIn } = setup(GRAFCET_FLOW_MAX_ZOOM - 0.5);
		expect(tool()).toHaveAttribute("aria-disabled", "false");

		fireEvent.click(tool());

		expect(zoomIn).toHaveBeenCalled();
	});

	it("se désactive tant que le zoom n'est pas connu", () => {
		setup(null);
		expect(tool()).toHaveAttribute("aria-disabled", "true");
	});
});
