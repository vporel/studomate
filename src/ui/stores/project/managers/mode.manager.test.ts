import type { ProjectStoreState } from "@/ui/stores/project/project.store";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import type { SimulationKind } from "@/ui/stores/project/SimulationKind";
import ModeManager, { modeChoiceOf } from "./mode.manager";

function setup(
	options: {
		mode?: ProjectMode;
		kind?: SimulationKind;
		enterHardwareIo?: boolean;
		simulationStarts?: boolean;
	} = {},
) {
	const calls: string[] = [];
	const hardwareLinkManager = {
		enterHardwareIo: jest.fn(async () => {
			calls.push("enterHardwareIo");
			return options.enterHardwareIo ?? true;
		}),
		leaveHardwareIo: jest.fn(async () => void calls.push("leaveHardwareIo")),
		goOnline: jest.fn(async () => {
			calls.push("goOnline");
			return true;
		}),
		onModeSettled: jest.fn(async () => void calls.push("onModeSettled")),
	};
	const simulationManager = {
		setDesignMode: jest.fn(() => void calls.push("setDesignMode")),
		setSimulationMode: jest.fn((kind: string) => {
			calls.push(`setSimulationMode:${kind}`);
			return options.simulationStarts ?? true;
		}),
	};
	const state = {
		mode: options.mode ?? ProjectMode.DESIGN,
		simulationKind: options.kind ?? "virtual",
		hardwareLinkManager,
		simulationManager,
	} as unknown as ProjectStoreState;
	return {
		manager: new ModeManager(() => state),
		calls,
		hardwareLinkManager,
		simulationManager,
	};
}

describe("modeChoiceOf", () => {
	it.each([
		[ProjectMode.DESIGN, "virtual", "DESIGN"],
		[ProjectMode.SIMULATION, "virtual", "SIMULATION"],
		[ProjectMode.SIMULATION, "hardware-io", "SIMULATION_HARDWARE_IO"],
		[ProjectMode.SIMULATION, "observation", "OBSERVATION"],
	] as const)(
		"%s with a %s simulation is the menu entry %s",
		(mode, kind, choice) => {
			expect(modeChoiceOf(mode, kind)).toBe(choice);
		},
	);

	it("ignores the simulation type in Design mode", () => {
		expect(modeChoiceOf(ProjectMode.DESIGN, "hardware-io")).toBe("DESIGN");
	});
});

describe("ModeManager.select", () => {
	it("goes to Design mode", async () => {
		const { manager, simulationManager } = setup({
			mode: ProjectMode.SIMULATION,
		});
		await manager.select("DESIGN");
		expect(simulationManager.setDesignMode).toHaveBeenCalledTimes(1);
	});

	it("starts a virtual simulation, without touching the board", async () => {
		const { manager, simulationManager, hardwareLinkManager } = setup();
		await manager.select("SIMULATION");
		expect(simulationManager.setSimulationMode).toHaveBeenCalledWith("virtual");
		expect(hardwareLinkManager.enterHardwareIo).not.toHaveBeenCalled();
	});

	it("puts the board on its pins before starting the simulation with the real I/O", async () => {
		const { manager, calls } = setup();
		await manager.select("SIMULATION_HARDWARE_IO");
		expect(calls).toEqual(["enterHardwareIo", "setSimulationMode:hardware-io"]);
	});

	it("does not start the simulation when the board cannot serve its pins, and settles the link", async () => {
		const { manager, calls, simulationManager } = setup({
			enterHardwareIo: false,
		});
		await manager.select("SIMULATION_HARDWARE_IO");
		expect(simulationManager.setSimulationMode).not.toHaveBeenCalled();
		expect(calls).toEqual(["enterHardwareIo", "onModeSettled"]);
	});

	it("gives the pins back when the simulation does not start", async () => {
		const { manager, calls } = setup({ simulationStarts: false });
		await manager.select("SIMULATION_HARDWARE_IO");
		expect(calls).toEqual([
			"enterHardwareIo",
			"setSimulationMode:hardware-io",
			"leaveHardwareIo",
			"onModeSettled",
		]);
	});

	it("observes the board, then settles the link", async () => {
		const { manager, calls } = setup();
		await manager.select("OBSERVATION");
		expect(calls).toEqual(["goOnline", "onModeSettled"]);
	});

	it("does nothing when the mode is already in place", async () => {
		const { manager, calls } = setup({
			mode: ProjectMode.SIMULATION,
			kind: "hardware-io",
		});
		await manager.select("SIMULATION_HARDWARE_IO");
		expect(calls).toEqual([]);
	});

	it("ignores a second request made while one is in progress", async () => {
		const { manager, hardwareLinkManager } = setup();
		let release: (value: boolean) => void = () => {};
		hardwareLinkManager.goOnline.mockImplementation(
			() => new Promise<boolean>((resolve) => (release = resolve)),
		);

		const first = manager.select("OBSERVATION");
		await manager.select("OBSERVATION");
		expect(hardwareLinkManager.goOnline).toHaveBeenCalledTimes(1);

		release(true);
		await first;
		hardwareLinkManager.goOnline.mockResolvedValue(true);
		await manager.select("OBSERVATION");
		expect(hardwareLinkManager.goOnline).toHaveBeenCalledTimes(2);
	});
});
