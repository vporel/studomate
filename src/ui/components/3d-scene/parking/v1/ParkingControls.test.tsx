/** @jest-environment jsdom */
import ParkingModel, {
	type ParkingState,
} from "@/3d-scenes/parking/v1/parking.model";
import { act, fireEvent, screen, within } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import ParkingControls from "./ParkingControls";

function setup({
	interactive = true,
	state = ParkingModel.createState() as ParkingState | null,
}: { interactive?: boolean; state?: ParkingState | null } = {}) {
	const frames: FrameRequestCallback[] = [];
	jest
		.spyOn(window, "requestAnimationFrame")
		.mockImplementation((callback) => frames.push(callback));
	const send = jest.fn();
	const view = renderWithI18n(
		<ParkingControls
			sample={() => state}
			interactive={interactive}
			send={send}
		/>,
	);
	act(() => frames.splice(0).forEach((callback) => callback(0)));
	return { send, ...view };
}

const group = (title: RegExp) =>
	within(screen.getByText(title).parentElement as HTMLElement);

describe("ParkingControls", () => {
	afterEach(() => jest.restoreAllMocks());

	it("sends an arrival from the cars behaviour panel", () => {
		const { send } = setup();
		fireEvent.click(
			group(/Comportement voitures/i).getByRole("button", { name: /Arrivée/ }),
		);
		expect(send).toHaveBeenCalledWith({ type: "arrival" });
	});

	it("sends a departure from the cars behaviour panel", () => {
		const { send } = setup();
		fireEvent.click(
			group(/Comportement voitures/i).getByRole("button", { name: /Sortie/ }),
		);
		expect(send).toHaveBeenCalledWith({ type: "departure" });
	});

	it("sends one interaction per click, so that clicks add up", () => {
		const { send } = setup();
		const button = screen.getByRole("button", { name: /Arrivée/ });
		fireEvent.click(button);
		fireEvent.click(button);
		expect(send).toHaveBeenCalledTimes(2);
	});

	it("disables the buttons and sends nothing when the simulation is not running", () => {
		const { send } = setup({ interactive: false });
		const button = screen.getByRole("button", { name: /Arrivée/ });
		expect(button).toBeDisabled();
		fireEvent.click(button);
		expect(send).not.toHaveBeenCalled();
	});

	it("puts the buttons in their own panel, apart from the console", () => {
		setup();
		expect(group(/Pupitre/i).queryByRole("button")).toBeNull();
	});

	it("shows the places counter in the console, or a dash while unknown", () => {
		const known = setup({
			state: { ...ParkingModel.createState(), places: 3 },
		});
		const display = screen.getByRole("status", { name: "Places occupées" });
		expect(display).toHaveTextContent("3");
		expect(group(/Pupitre/i).getByRole("status")).toBe(display);
		known.unmount();
		setup();
		expect(screen.getByRole("status")).toHaveTextContent("-");
	});

	it("lights each barrier lamp once its own barrier is open, and the full lamp on demand", () => {
		setup({
			state: {
				...ParkingModel.createState(),
				barriers: { entry: 100, exit: 0 },
				full: true,
			},
		});
		const lit = (name: string) =>
			screen.getByRole("img", { name }).getAttribute("data-lit");
		expect(lit("Barrière d'entrée ouverte")).toBe("true");
		expect(lit("Barrière de sortie ouverte")).toBe("false");
		expect(lit("Complet")).toBe("true");
	});

	it("lights the request lamps while a car waits in front of the matching barrier", () => {
		setup({
			state: {
				...ParkingModel.createState(),
				cars: [{ id: 0, phase: "arriving", stall: null, s: 332 }],
			},
		});
		const lit = (name: string) =>
			screen.getByRole("img", { name }).getAttribute("data-lit");
		expect(lit("Demande entrée")).toBe("true");
		expect(lit("Demande sortie")).toBe("false");
	});

	it("keeps every lamp off for closed barriers and a lot that is not full", () => {
		setup();
		for (const name of [
			"Demande entrée",
			"Demande sortie",
			"Barrière d'entrée ouverte",
			"Barrière de sortie ouverte",
			"Complet",
		]) {
			expect(screen.getByRole("img", { name })).toHaveAttribute(
				"data-lit",
				"false",
			);
		}
	});
});
