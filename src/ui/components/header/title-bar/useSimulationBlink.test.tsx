/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import { SimulationMode } from "@/ui/stores/project/simulation-mode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import useSimulationBlink from "./useSimulationBlink";

jest.mock("@/ui/components/projects/ProjectContext");

type State = {
	mode: ProjectMode;
	simulationKind: string;
	simulationMode: SimulationMode;
	simulationPaused: boolean;
};

const continuousSimulation: State = {
	mode: ProjectMode.SIMULATION,
	simulationKind: "local",
	simulationMode: SimulationMode.CONTINUOUS,
	simulationPaused: false,
};

function setState(state: State) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation(state),
	);
}

describe("useSimulationBlink", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("is not running in design mode and never blinks", () => {
		setState({ ...continuousSimulation, mode: ProjectMode.DESIGN });
		const { result } = renderHook(() => useSimulationBlink());

		act(() => jest.advanceTimersByTime(2000));

		expect(result.current).toEqual({ running: false, blinkOff: false });
	});

	it("toggles every 500 ms during a continuous simulation", () => {
		setState(continuousSimulation);
		const { result } = renderHook(() => useSimulationBlink());

		expect(result.current).toEqual({ running: true, blinkOff: false });
		act(() => jest.advanceTimersByTime(500));
		expect(result.current.blinkOff).toBe(true);
		act(() => jest.advanceTimersByTime(500));
		expect(result.current.blinkOff).toBe(false);
	});

	it("is running but fixed when the simulation is paused", () => {
		setState({ ...continuousSimulation, simulationPaused: true });
		const { result } = renderHook(() => useSimulationBlink());

		act(() => jest.advanceTimersByTime(2000));

		expect(result.current).toEqual({ running: true, blinkOff: false });
	});

	it("is running but fixed in step by step mode", () => {
		setState({
			...continuousSimulation,
			simulationMode: SimulationMode.STEP_BY_STEP,
		});
		const { result } = renderHook(() => useSimulationBlink());

		act(() => jest.advanceTimersByTime(2000));

		expect(result.current).toEqual({ running: true, blinkOff: false });
	});

	it("is not running when observing a board", () => {
		setState({ ...continuousSimulation, simulationKind: "observation" });
		const { result } = renderHook(() => useSimulationBlink());

		act(() => jest.advanceTimersByTime(2000));

		expect(result.current).toEqual({ running: false, blinkOff: false });
	});

	it("resets the colour when the blinking stops", () => {
		setState(continuousSimulation);
		const { result, rerender } = renderHook(() => useSimulationBlink());
		act(() => jest.advanceTimersByTime(500));
		expect(result.current.blinkOff).toBe(true);

		setState({ ...continuousSimulation, simulationPaused: true });
		rerender();

		expect(result.current).toEqual({ running: true, blinkOff: false });
	});

	it("stops its interval on unmount", () => {
		setState(continuousSimulation);
		const { unmount } = renderHook(() => useSimulationBlink());
		expect(jest.getTimerCount()).toBe(1);

		unmount();

		expect(jest.getTimerCount()).toBe(0);
	});
});
