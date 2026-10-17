/** @jest-environment jsdom */
import CartonSortingModel, {
	type CartonSortingState,
} from "@/3d-scenes/carton-sorting/v1/carton-sorting.model";
import { act, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import CartonSortingLamps from "./CartonSortingLamps";

function setup(state: CartonSortingState | null) {
	const frames: FrameRequestCallback[] = [];
	jest
		.spyOn(window, "requestAnimationFrame")
		.mockImplementation((callback) => frames.push(callback));
	renderWithI18n(<CartonSortingLamps sample={() => state} />);
	act(() => frames.splice(0).forEach((callback) => callback(0)));
}

const initial = () => CartonSortingModel.createState();
const lit = (name: string) =>
	screen.getByRole("img", { name }).getAttribute("data-lit") === "true";

describe("CartonSortingLamps", () => {
	afterEach(() => jest.restoreAllMocks());

	it("lights the retracted position of the cylinders at rest, and nothing else", () => {
		setup(initial());
		for (const cylinder of ["P1", "P2", "P3"]) {
			expect(lit(`${cylinder} rentré`)).toBe(true);
			expect(lit(`${cylinder} sorti`)).toBe(false);
			expect(lit(`${cylinder} cmd +`)).toBe(false);
			expect(lit(`${cylinder} cmd −`)).toBe(false);
		}
		expect(lit("T1")).toBe(false);
		expect(lit("T2 / T3")).toBe(false);
		expect(lit("prés.")).toBe(false);
		expect(lit("haute")).toBe(false);
	});

	it("lights the commands the PLC gives and the conveyors that run", () => {
		setup({
			...initial(),
			t1Running: true,
			commands: { ...initial().commands, p2Out: true, p3In: true },
		});
		expect(lit("T1")).toBe(true);
		expect(lit("T2 / T3")).toBe(false);
		expect(lit("P2 cmd +")).toBe(true);
		expect(lit("P3 cmd −")).toBe(true);
		expect(lit("P1 cmd +")).toBe(false);
	});

	it("lights the fully extended position of a cylinder, not its retracted one", () => {
		setup({ ...initial(), cylinders: { p1: 60, p2: 0, p3: 0 } });
		expect(lit("P1 sorti")).toBe(true);
		expect(lit("P1 rentré")).toBe(false);
	});

	it("lights the detection of a carton at the station and at a level", () => {
		setup({
			...initial(),
			cartonExists: true,
			cartonPresent: true,
			cartonTall: true,
			cartonPos: 516,
		});
		expect(lit("prés.")).toBe(true);
		expect(lit("haute")).toBe(true);
		expect(lit("P2")).toBe(false);
	});

	it("shows every lamp off while the scene has no state", () => {
		setup(null);
		expect(lit("P1 rentré")).toBe(false);
		expect(lit("T1")).toBe(false);
	});
});
