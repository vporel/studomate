/**
 * @jest-environment jsdom
 */
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { SimulationMode } from "@/ui/stores/project/SimulationMode.enum";
import { screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import SimulationControls from "./SimulationControls";
import SimulationModeSelect from "./SimulationModeSelect";

jest.mock("@/ui/components/projects/ProjectContext");

function mockStore(simulationKind: "virtual" | "hardware-io" | "observation") {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			mode: ProjectMode.SIMULATION,
			simulationMode: SimulationMode.CONTINUOUS,
			simulationPaused: false,
			simulationKind,
			simulationManager: {},
		}),
	);
}

describe("simulation controls", () => {
	afterEach(() => jest.clearAllMocks());

	it("offer pause and the pacing choice for a simulation with the local PLC", () => {
		mockStore("virtual");
		const { container } = renderWithI18n(
			<>
				<SimulationControls />
				<SimulationModeSelect />
			</>,
		);
		expect(screen.getByRole("button")).toBeInTheDocument();
		expect(container.querySelector("select")).not.toBeNull();
	});

	it("are absent while the program of a board is observed", () => {
		mockStore("observation");
		const { container } = renderWithI18n(
			<>
				<SimulationControls />
				<SimulationModeSelect />
			</>,
		);
		expect(container).toBeEmptyDOMElement();
	});
});
