/** @jest-environment jsdom */
import ElevatorModel, {
	type ElevatorState,
} from "@/3d-scenes/elevator/v1/elevator.model";
import { act, fireEvent, screen, within } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import ElevatorControls from "./ElevatorControls";

function setup({
	interactive = true,
	state = ElevatorModel.createState() as ElevatorState | null,
}: { interactive?: boolean; state?: ElevatorState | null } = {}) {
	const frames: FrameRequestCallback[] = [];
	jest
		.spyOn(window, "requestAnimationFrame")
		.mockImplementation((callback) => frames.push(callback));
	const send = jest.fn();
	const view = renderWithI18n(
		<ElevatorControls
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
const floorButton = (panel: RegExp, name: RegExp) =>
	group(panel).getByRole("button", { name });

describe("ElevatorControls", () => {
	beforeAll(() => {
		window.PointerEvent ??= MouseEvent as unknown as typeof PointerEvent;
	});
	afterEach(() => jest.restoreAllMocks());

	it("sends a press then a release for the cabin button of a floor", () => {
		const { send } = setup();
		const button = floorButton(/Intérieur cabine/i, /Étage 1/);
		fireEvent.pointerDown(button, { button: 0 });
		expect(send).toHaveBeenLastCalledWith({
			type: "pressButton",
			button: "cabinButton1",
		});
		fireEvent.pointerUp(button);
		expect(send).toHaveBeenLastCalledWith({
			type: "releaseButton",
			button: "cabinButton1",
		});
	});

	it("sends the landing call of a floor from the outside panel", () => {
		const { send } = setup();
		fireEvent.pointerDown(floorButton(/Extérieur cabine/i, /RDC/), {
			button: 0,
		});
		expect(send).toHaveBeenCalledWith({
			type: "pressButton",
			button: "landingButton0",
		});
	});

	it("sends the press once while the button is held, and no release without a press", () => {
		const { send } = setup();
		const button = floorButton(/Intérieur cabine/i, /RDC/);
		fireEvent.pointerLeave(button);
		expect(send).not.toHaveBeenCalled();
		fireEvent.pointerDown(button, { button: 0 });
		fireEvent.pointerDown(button, { button: 0 });
		expect(send).toHaveBeenCalledTimes(1);
	});

	it("can be operated with the keyboard", () => {
		const { send } = setup();
		const button = floorButton(/Intérieur cabine/i, /Étage 2/);
		fireEvent.keyDown(button, { key: " " });
		fireEvent.keyUp(button, { key: " " });
		expect(send).toHaveBeenNthCalledWith(1, {
			type: "pressButton",
			button: "cabinButton2",
		});
		expect(send).toHaveBeenNthCalledWith(2, {
			type: "releaseButton",
			button: "cabinButton2",
		});
	});

	it("disables the buttons and sends nothing when the simulation is not running", () => {
		const { send } = setup({ interactive: false });
		const button = floorButton(/Extérieur cabine/i, /RDC/);
		expect(button).toBeDisabled();
		fireEvent.pointerDown(button, { button: 0 });
		expect(send).not.toHaveBeenCalled();
	});

	it("shows the displayed floor, or a dash while unknown", () => {
		const known = setup({
			state: { ...ElevatorModel.createState(), currentFloor: 2 },
		});
		expect(screen.getByRole("status")).toHaveTextContent("2");
		known.unmount();
		setup();
		expect(screen.getByRole("status")).toHaveTextContent("-");
	});

	it('shows the floor display, labelled "Étage", in the outside panel', () => {
		setup();
		const display = screen.getByRole("status", { name: "Étage" });
		expect(group(/Extérieur cabine/i).getByRole("status")).toBe(display);
	});

	it("lights the lamps of the commands and of the open door", () => {
		setup({
			state: {
				...ElevatorModel.createState(),
				commands: { up: true, down: false, door: false },
				doorPosition: 100,
			},
		});
		expect(screen.getByRole("img", { name: "Montée" })).toHaveAttribute(
			"data-lit",
			"true",
		);
		expect(screen.getByRole("img", { name: "Descente" })).toHaveAttribute(
			"data-lit",
			"false",
		);
		expect(screen.getByRole("img", { name: "Porte ouverte" })).toHaveAttribute(
			"data-lit",
			"true",
		);
	});
});
