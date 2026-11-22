/**
 * @jest-environment jsdom
 */
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import { SimulationMode } from "@/ui/stores/project/simulation-mode.enum";
import { screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import SimulationIndicator from "./SimulationIndicator";

jest.mock("@/ui/components/projects/ProjectContext");

function setup(mode: ProjectMode, kind = "virtual") {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			mode,
			simulationKind: kind,
			simulationMode: SimulationMode.CONTINUOUS,
			simulationPaused: true,
		}),
	);
	return renderWithI18n(<SimulationIndicator />);
}

describe("SimulationIndicator", () => {
	it("shows the simulation in progress, without any action", () => {
		setup(ProjectMode.SIMULATION);
		expect(screen.getByRole("status")).toHaveTextContent("Simulation");
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("shows nothing in design mode", () => {
		const { container } = setup(ProjectMode.DESIGN);
		expect(container).toBeEmptyDOMElement();
	});

	it("shows nothing while observing a board", () => {
		const { container } = setup(ProjectMode.SIMULATION, "observation");
		expect(container).toBeEmptyDOMElement();
	});
});
