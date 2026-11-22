/** @jest-environment jsdom */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { SimulationMode } from "@/ui/stores/project/simulation-mode.enum";
import SimulationModeSelect from "./SimulationModeSelect";

jest.mock("@/ui/components/projects/ProjectContext");

function setup(
	simulationMode = SimulationMode.CONTINUOUS,
	simulationKind = "virtual",
) {
	const setPlcSimulationMode = jest.fn();
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			simulationMode,
			simulationKind,
			simulationManager: { setPlcSimulationMode },
		}),
	);
	renderWithI18n(<SimulationModeSelect />);
	return { setPlcSimulationMode };
}

describe("SimulationModeSelect", () => {
	it("offers both modes and selects the current one", () => {
		setup(SimulationMode.STEP_BY_STEP);
		expect(screen.getByRole("option", { name: "Continu" })).toBeInTheDocument();
		expect(screen.getByRole("combobox")).toHaveValue(
			SimulationMode.STEP_BY_STEP,
		);
	});

	it("changes the PLC simulation mode on selection", () => {
		const { setPlcSimulationMode } = setup();
		fireEvent.change(screen.getByRole("combobox"), {
			target: { value: SimulationMode.STEP_BY_STEP },
		});
		expect(setPlcSimulationMode).toHaveBeenCalledWith(
			SimulationMode.STEP_BY_STEP,
		);
	});

	it("renders nothing when the program follows a board", () => {
		setup(SimulationMode.CONTINUOUS, "observation");
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
	});
});
