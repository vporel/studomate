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

function setup(scene3d: object | null) {
	(useProjectStore as jest.Mock).mockImplementation(
		selectorImplementation({
			project: { scene3d, hmiPages: {} },
			mode: "design",
			analysisHasErrors: false,
			analysisHasWarnings: false,
			setAnalysisResultVisible: jest.fn(),
			setCrossReferenceResultVisible: jest.fn(),
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

	it("shows the 3D scene button just before the cross-references one when a scene is configured", () => {
		setup({ sceneId: "parking", sceneVersion: 1, bindings: {} });
		const labels = screen
			.getAllByRole("button")
			.map((button) => button.textContent);
		expect(labels.indexOf("Scène 3D")).toBe(
			labels.indexOf("Références croisées") - 1,
		);
	});

	it("toggles the scene when clicked", () => {
		setup({ sceneId: "parking", sceneVersion: 1, bindings: {} });
		fireEvent.click(screen.getByRole("button", { name: "Scène 3D" }));
		expect(toggle).toHaveBeenCalledTimes(1);
	});
});
