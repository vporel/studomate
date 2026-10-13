/**
 * @jest-environment jsdom
 */
import { isWebSerialSupported } from "@/hardware/arduino/remote-io/web-serial.transport";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import ProjectModeSwitcher from "./ProjectModeSwitcher";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/hardware/arduino/remote-io/web-serial.transport", () => ({
	isWebSerialSupported: jest.fn(() => true),
}));

function setup({
	mode = "DESIGN",
	kind = "virtual",
	hasBoard = true,
}: { mode?: string; kind?: string; hasBoard?: boolean } = {}) {
	const modeManager = { select: jest.fn() };
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			mode,
			simulationKind: kind,
			simulationMode: "CONTINUOUS",
			project: {
				hardwareTarget: hasBoard ? { modelId: "arduino-uno-r3" } : null,
			},
			modeManager,
		}),
	);
	renderWithI18n(<ProjectModeSwitcher />);
	return {
		modeManager,
		select: screen.getByRole("combobox") as HTMLSelectElement,
	};
}

const optionLabels = (select: HTMLSelectElement) =>
	Array.from(select.options).map((option) => option.textContent);

describe("ProjectModeSwitcher", () => {
	beforeEach(() => (isWebSerialSupported as jest.Mock).mockReturnValue(true));

	it("offers the four modes when the project has a board", () => {
		const { select } = setup();
		expect(optionLabels(select)).toEqual([
			"Conception",
			"Simulation",
			"Simulation avec E/S réelles",
			"Observation de la carte",
		]);
	});

	it("offers only Design and Simulation without a board", () => {
		const { select } = setup({ hasBoard: false });
		expect(optionLabels(select)).toEqual(["Conception", "Simulation"]);
	});

	it("offers only Design and Simulation in a browser without Web Serial", () => {
		(isWebSerialSupported as jest.Mock).mockReturnValue(false);
		const { select } = setup();
		expect(optionLabels(select)).toEqual(["Conception", "Simulation"]);
	});

	it.each([
		["DESIGN", "virtual", "DESIGN"],
		["SIMULATION", "virtual", "SIMULATION"],
		["SIMULATION", "hardware-io", "SIMULATION_HARDWARE_IO"],
		["SIMULATION", "observation", "OBSERVATION"],
	])("selects the entry of mode %s, simulation %s", (mode, kind, value) => {
		const { select } = setup({ mode, kind });
		expect(select.value).toBe(value);
	});

	it.each(["SIMULATION", "SIMULATION_HARDWARE_IO", "OBSERVATION", "DESIGN"])(
		"asks the mode manager for %s",
		(choice) => {
			const { modeManager, select } = setup({
				mode: choice === "DESIGN" ? "SIMULATION" : "DESIGN",
			});
			fireEvent.change(select, { target: { value: choice } });
			expect(modeManager.select).toHaveBeenCalledWith(choice);
		},
	);
});
