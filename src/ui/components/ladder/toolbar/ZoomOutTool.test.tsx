/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from "@testing-library/react";
import { LADDER_FLOW_MIN_ZOOM } from "@/ui/stores/ladder/managers/view.manager";
import { useLadderStore } from "../context/LadderContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import ZoomOutTool from "./ZoomOutTool";

jest.mock("../context/LadderContext");

function setup(zoom: number, zoomOut = jest.fn()) {
	(useLadderStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ viewManager: { zoomOut }, zoom }),
	);
	render(<ZoomOutTool />);
	return { zoomOut };
}

function tool(): HTMLElement {
	return document.querySelector(".app-toolbar__zoom-out") as HTMLElement;
}

describe("ZoomOutTool (Ladder)", () => {
	it("se désactive au zoom minimum", () => {
		setup(LADDER_FLOW_MIN_ZOOM);
		expect(tool()).toHaveAttribute("aria-disabled", "true");
	});

	it("reste actif au-dessus du zoom minimum, et dézoome au clic", () => {
		const { zoomOut } = setup(LADDER_FLOW_MIN_ZOOM + 0.5);
		expect(tool()).toHaveAttribute("aria-disabled", "false");

		fireEvent.click(tool());

		expect(zoomOut).toHaveBeenCalled();
	});
});
