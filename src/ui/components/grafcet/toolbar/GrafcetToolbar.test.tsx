/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
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
				grafcet: { id: "g1", excludedFromExecution: false },
				nodes: [],
				viewManager: {
					getZoom: () => 1,
					zoomIn: jest.fn(),
					zoomOut: jest.fn(),
				},
			}),
		);

		renderWithI18n(
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
			expect(
				document.querySelector(`.grafcet-toolbar__${cls}`),
			).toBeInTheDocument();
		});
		expect(document.querySelector(".app-toolbar__zoom-in")).toBeInTheDocument();
		expect(
			document.querySelector(".app-toolbar__zoom-out"),
		).toBeInTheDocument();
	});

	it("shows the execution warning for an excluded grafcet, whose dialog re-includes it", () => {
		const grafcetsManager = { setExcludedFromExecution: jest.fn() };
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({ mode: ProjectMode.DESIGN, grafcetsManager }),
		);
		(useGrafcetStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				grafcet: { id: "g1", excludedFromExecution: true },
				nodes: [],
				viewManager: {
					getZoom: () => 1,
					zoomIn: jest.fn(),
					zoomOut: jest.fn(),
				},
			}),
		);

		renderWithI18n(
			<GrafcetToolbarDnDProvider>
				<GrafcetToolbar />
			</GrafcetToolbarDnDProvider>,
		);
		fireEvent.click(screen.getByText("Exclu de l'exécution"));
		fireEvent.click(screen.getByText("Inclure dans l'exécution"));

		expect(grafcetsManager.setExcludedFromExecution).toHaveBeenCalledWith(
			"g1",
			false,
		);
	});
});
