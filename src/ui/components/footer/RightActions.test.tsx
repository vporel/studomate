/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import RightActions from "./RightActions";

jest.mock("@/ui/components/projects/ProjectContext");

const toggle = jest.fn();
const setAnalysisResultVisible = jest.fn();
const setCrossReferenceResultVisible = jest.fn();

function setup(
	scene3d: object | null,
	active: "analysis" | "crossReference" | null = null,
) {
	(useProjectStore as jest.Mock).mockImplementation(
		selectorImplementation({
			project: { scene3d, hmiPages: {} },
			mode: "design",
			analysisHasErrors: false,
			analysisHasWarnings: false,
			ui: {
				analysisResultVisible: active === "analysis",
				crossReferenceResultVisible: active === "crossReference",
			},
			setAnalysisResultVisible,
			setCrossReferenceResultVisible,
			setWatchTablesVisible: jest.fn(),
			hmiManager: { openHmiSimulationPageIfAny: jest.fn() },
			scene3dDisplayManager: { toggle },
		}),
	);
	return renderWithI18n(<RightActions />);
}

describe("RightActions", () => {
	afterEach(() => jest.clearAllMocks());

	it("has no 3D scene button when the project has no scene", () => {
		setup(null);
		expect(
			screen.queryByRole("button", { name: "Scène 3D" }),
		).not.toBeInTheDocument();
	});

	it("puts the cross-references and analysis buttons first, before the 3D scene one", () => {
		setup({ sceneId: "parking", sceneVersion: 1, bindings: {} });
		const labels = screen
			.getAllByRole("button")
			.map((button) => button.textContent);
		expect(labels).toEqual([
			"Références croisées",
			"Résultats de l'analyse (OK)",
			"Scène 3D",
		]);
	});

	it("toggles the scene when clicked", () => {
		setup({ sceneId: "parking", sceneVersion: 1, bindings: {} });
		fireEvent.click(screen.getByRole("button", { name: "Scène 3D" }));
		expect(toggle).toHaveBeenCalledTimes(1);
	});

	describe("bottom panel buttons", () => {
		it("opens the cross-references", () => {
			setup(null);
			fireEvent.click(
				screen.getByRole("button", { name: "Références croisées" }),
			);
			expect(setCrossReferenceResultVisible).toHaveBeenCalledWith(true);
		});

		it("opens the analysis", () => {
			setup(null);
			fireEvent.click(
				screen.getByRole("button", { name: /Résultats de l'analyse/ }),
			);
			expect(setAnalysisResultVisible).toHaveBeenCalledWith(true);
		});

		it.each(["analysis", "crossReference"] as const)(
			"are both hidden while the bottom panel shows %s, the other buttons staying",
			(active) => {
				setup({ sceneId: "parking", sceneVersion: 1, bindings: {} }, active);
				expect(
					screen.getAllByRole("button").map((button) => button.textContent),
				).toEqual(["Scène 3D"]);
			},
		);
	});
});
