/** @jest-environment jsdom */
import DrillingModel, {
	type DrillingState,
} from "@/3d-scenes/drilling/v1/drilling.model";
import { act, fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import DrillingControls from "./DrillingControls";

function setup({
	interactive = true,
	state = DrillingModel.createState() as DrillingState | null,
}: { interactive?: boolean; state?: DrillingState | null } = {}) {
	const frames: FrameRequestCallback[] = [];
	jest
		.spyOn(window, "requestAnimationFrame")
		.mockImplementation((callback) => frames.push(callback));
	const send = jest.fn();
	const view = renderWithI18n(
		<DrillingControls
			sample={() => state}
			interactive={interactive}
			send={send}
		/>,
	);
	act(() => frames.splice(0).forEach((callback) => callback(0)));
	return { send, ...view };
}

const startButton = () => screen.getByRole("button", { name: "Départ cycle" });
const lamp = (name: string) => screen.getByRole("img", { name });

describe("DrillingControls", () => {
	beforeAll(() => {
		window.PointerEvent ??= MouseEvent as unknown as typeof PointerEvent;
	});
	afterEach(() => jest.restoreAllMocks());

	it("sends a press then a release of the start button", () => {
		const { send } = setup();
		fireEvent.pointerDown(startButton(), { button: 0 });
		expect(send).toHaveBeenLastCalledWith({ type: "pressStart" });
		fireEvent.pointerUp(startButton());
		expect(send).toHaveBeenLastCalledWith({ type: "releaseStart" });
	});

	it("sends the press once while held, and no release without a press", () => {
		const { send } = setup();
		fireEvent.pointerLeave(startButton());
		expect(send).not.toHaveBeenCalled();
		fireEvent.pointerDown(startButton(), { button: 0 });
		fireEvent.pointerDown(startButton(), { button: 0 });
		expect(send).toHaveBeenCalledTimes(1);
	});

	it("can be operated with the keyboard", () => {
		const { send } = setup();
		fireEvent.keyDown(startButton(), { key: "Enter" });
		fireEvent.keyUp(startButton(), { key: "Enter" });
		expect(send).toHaveBeenNthCalledWith(1, { type: "pressStart" });
		expect(send).toHaveBeenNthCalledWith(2, { type: "releaseStart" });
	});

	it("disables the button and sends nothing when the simulation is not running", () => {
		const { send } = setup({ interactive: false });
		expect(startButton()).toBeDisabled();
		fireEvent.pointerDown(startButton(), { button: 0 });
		expect(send).not.toHaveBeenCalled();
	});

	it("lights the command lamps and the limit switch lamps from the state", () => {
		setup({
			state: {
				...DrillingModel.createState(),
				position: 100,
				commands: { down: false, up: false, spindle: true },
			},
		});
		const lit = (name: string) => lamp(name).getAttribute("data-lit");
		expect(lit("Broche")).toBe("true");
		expect(lit("Descente")).toBe("false");
		expect(lit("Montée")).toBe("false");
		expect(lit("Foret en bas")).toBe("true");
		expect(lit("Foret en haut")).toBe("false");
	});
});
