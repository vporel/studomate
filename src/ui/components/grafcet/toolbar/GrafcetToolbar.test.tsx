/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useGrafcetStore } from "../context/GrafcetContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { GrafcetToolbarDnDProvider } from "./GrafcetToolbarDnDContext";
import GrafcetToolbar from "./GrafcetToolbar";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("../context/GrafcetContext");

describe("GrafcetToolbar", () => {
	it("assemble tous les outils sans planter", () => {
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({ mode: ProjectMode.DESIGN }),
		);
		(useGrafcetStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				nodes: [],
				viewManager: { getZoom: () => 1, zoomIn: jest.fn(), zoomOut: jest.fn() },
			}),
		);

		render(
			<GrafcetToolbarDnDProvider>
				<GrafcetToolbar />
			</GrafcetToolbarDnDProvider>,
		);

		const expectedClasses = [
			"step",
			"action",
			"transition",
			"junction-or-start",
			"junction-or-end",
			"junction-and-start",
			"junction-and-end",
			"step-referral-source",
			"step-referral-target",
			"comment",
		];
		expectedClasses.forEach((cls) => {
			expect(document.querySelector(`.grafcet-toolbar__${cls}`)).toBeInTheDocument();
		});
		expect(document.querySelector(".app-toolbar__zoom-in")).toBeInTheDocument();
		expect(document.querySelector(".app-toolbar__zoom-out")).toBeInTheDocument();
	});
});
