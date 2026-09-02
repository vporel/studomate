/**
 * @jest-environment jsdom
 */
import { fireEvent } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { GRAFCET_FLOW_MIN_ZOOM } from "@/ui/stores/grafcet/managers/view.manager";
import { useGrafcetStore } from "../context/GrafcetContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import ZoomOutTool from "./ZoomOutTool";

jest.mock("../context/GrafcetContext");

function setup(zoom: number | null, zoomOut = jest.fn()) {
	(useGrafcetStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ viewManager: { getZoom: () => zoom, zoomOut } }),
	);
	renderWithI18n(<ZoomOutTool />);
	return { zoomOut };
}

function tool(): HTMLElement {
	return document.querySelector(".app-toolbar__zoom-out") as HTMLElement;
}

describe("ZoomOutTool", () => {
	it("se désactive au zoom minimum", () => {
		setup(GRAFCET_FLOW_MIN_ZOOM);
		expect(tool()).toHaveAttribute("aria-disabled", "true");
	});

	it("reste actif au-dessus du zoom minimum, et dézoome au clic", () => {
		const { zoomOut } = setup(GRAFCET_FLOW_MIN_ZOOM + 0.5);
		expect(tool()).toHaveAttribute("aria-disabled", "false");

		fireEvent.click(tool());

		expect(zoomOut).toHaveBeenCalled();
	});

	it("se désactive tant que le zoom n'est pas connu", () => {
		setup(null);
		expect(tool()).toHaveAttribute("aria-disabled", "true");
	});
});
