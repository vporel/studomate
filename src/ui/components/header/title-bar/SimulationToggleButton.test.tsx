/**
 * @jest-environment jsdom
 */
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import { SimulationMode } from "@/ui/stores/project/simulation-mode.enum";
import { act, fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import SimulationToggleButton from "./SimulationToggleButton";

jest.mock("@/ui/components/projects/ProjectContext");

function setup({
	mode = ProjectMode.DESIGN,
	kind = "virtual",
	simulationMode = SimulationMode.CONTINUOUS,
	simulationPaused = false,
}: {
	mode?: ProjectMode;
	kind?: string;
	simulationMode?: SimulationMode;
	simulationPaused?: boolean;
} = {}) {
	const modeManager = { select: jest.fn() };
	const mockState = (paused: boolean) =>
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				mode,
				simulationKind: kind,
				simulationMode,
				simulationPaused: paused,
				modeManager,
			}),
		);
	mockState(simulationPaused);
	const { rerender } = renderWithI18n(<SimulationToggleButton />);
	return {
		modeManager,
		button: screen.getByRole("button"),
		setPaused: (paused: boolean) => {
			mockState(paused);
			rerender(<SimulationToggleButton />);
		},
	};
}

describe("SimulationToggleButton", () => {
	afterEach(() => jest.clearAllMocks());

	it("starts the simulation from design mode", () => {
		const { modeManager, button } = setup();
		expect(button).toHaveTextContent("Simuler");
		fireEvent.click(button);
		expect(modeManager.select).toHaveBeenCalledWith("SIMULATION");
	});

	it("goes back to design from the simulation", () => {
		const { modeManager, button } = setup({ mode: ProjectMode.SIMULATION });
		expect(button).toHaveTextContent("Arrêter");
		fireEvent.click(button);
		expect(modeManager.select).toHaveBeenCalledWith("DESIGN");
	});

	describe("blinking", () => {
		const STEADY = "rgb(46, 125, 50)";
		const colors = (button: HTMLElement, ticks: number) => {
			const seen: string[] = [];
			for (let i = 0; i < ticks; i++) {
				act(() => {
					jest.advanceTimersByTime(500);
				});
				seen.push(button.style.backgroundColor);
			}
			return seen;
		};

		beforeEach(() => jest.useFakeTimers());
		afterEach(() => jest.useRealTimers());

		it("blinks in continuous simulation", () => {
			const { button } = setup({ mode: ProjectMode.SIMULATION });
			expect(new Set(colors(button, 4)).size).toBe(2);
		});

		it("keeps the steady colour while paused", () => {
			const { button } = setup({
				mode: ProjectMode.SIMULATION,
				simulationPaused: true,
			});
			expect(new Set(colors(button, 4))).toEqual(new Set([STEADY]));
		});

		it("blinks again once resumed", () => {
			const { button, setPaused } = setup({
				mode: ProjectMode.SIMULATION,
				simulationPaused: true,
			});
			colors(button, 2);
			setPaused(false);
			expect(new Set(colors(button, 4)).size).toBe(2);
		});

		it("restores the steady colour when paused mid-blink", () => {
			const { button, setPaused } = setup({ mode: ProjectMode.SIMULATION });
			colors(button, 1);
			setPaused(true);
			expect(new Set(colors(button, 3))).toEqual(new Set([STEADY]));
		});

		it("does not blink in step-by-step simulation", () => {
			const { button } = setup({
				mode: ProjectMode.SIMULATION,
				simulationMode: SimulationMode.STEP_BY_STEP,
			});
			expect(new Set(colors(button, 4))).toEqual(new Set([STEADY]));
		});

		it("keeps white text on every green of the blink", () => {
			const { button } = setup({ mode: ProjectMode.SIMULATION });
			for (let i = 0; i < 3; i++) {
				act(() => {
					jest.advanceTimersByTime(500);
				});
				expect(button.style.color).toBe("white");
			}
		});

		it("is not highlighted in design mode", () => {
			const { button } = setup();
			expect(button.style.backgroundColor).toBe("");
			expect(button.style.color).toBe("");
		});

		it("is not highlighted while observing a board", () => {
			const { button } = setup({
				mode: ProjectMode.SIMULATION,
				kind: "observation",
			});
			expect(button.style.backgroundColor).toBe("");
			expect(button.style.color).toBe("");
		});
	});
});
