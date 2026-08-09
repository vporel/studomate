/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from "@testing-library/react";
import { LADDER_FLOW_MAX_ZOOM } from "@/ui/stores/ladder/managers/view.manager";
import { useLadderStore } from "../context/LadderContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import ZoomInTool from "./ZoomInTool";

jest.mock("../context/LadderContext");

function setup(zoom: number, zoomIn = jest.fn()) {
	(useLadderStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ viewManager: { zoomIn }, zoom }),
	);
	render(<ZoomInTool />);
	return { zoomIn };
}

function tool(): HTMLElement {
	return document.querySelector(".app-toolbar__zoom-in") as HTMLElement;
}

describe("ZoomInTool (Ladder)", () => {
	it("se désactive au zoom maximum", () => {
		setup(LADDER_FLOW_MAX_ZOOM);
		expect(tool()).toHaveAttribute("aria-disabled", "true");
	});

	it("reste actif en-dessous du zoom maximum, et zoome au clic", () => {
		const { zoomIn } = setup(LADDER_FLOW_MAX_ZOOM - 0.5);
		expect(tool()).toHaveAttribute("aria-disabled", "false");

		fireEvent.click(tool());

		expect(zoomIn).toHaveBeenCalled();
	});
});
