/** @jest-environment jsdom */
import CartonSortingModel, {
	type CartonSortingState,
} from "@/3d-scenes/carton-sorting/v1/carton-sorting.model";
import { act, fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import CartonSortingControls from "./CartonSortingControls";

function setup({
	interactive = true,
	state = CartonSortingModel.createState() as CartonSortingState | null,
}: { interactive?: boolean; state?: CartonSortingState | null } = {}) {
	const frames: FrameRequestCallback[] = [];
	jest
		.spyOn(window, "requestAnimationFrame")
		.mockImplementation((callback) => frames.push(callback));
	const send = jest.fn();
	const view = renderWithI18n(
		<CartonSortingControls
			sample={() => state}
			interactive={interactive}
			send={send}
		/>,
	);
	act(() => frames.splice(0).forEach((callback) => callback(0)));
	return { send, ...view };
}

const startButton = () => screen.getByRole("button", { name: /Départ cycle/ });
const placeButton = () =>
	screen.getByRole("button", { name: /Placer la caisse/ });
const heightSwitch = () => screen.getByRole("switch");

describe("CartonSortingControls", () => {
	beforeAll(() => {
		// jsdom has no PointerEvent: a mouse event carries the same `button`.
		window.PointerEvent ??= MouseEvent as unknown as typeof PointerEvent;
	});
	afterEach(() => jest.restoreAllMocks());

	it("places a carton when the button is pressed", () => {
		const { send } = setup();
		fireEvent.click(placeButton());
		expect(send).toHaveBeenCalledWith({ type: "newCarton" });
	});

	it("disables the button while a carton is in transit", () => {
		const state = {
			...CartonSortingModel.createState(),
			cartonExists: true,
			cartonXExtra: 0,
		};
		const { send } = setup({ state });
		expect(placeButton()).toBeDisabled();
		fireEvent.click(placeButton());
		expect(send).not.toHaveBeenCalled();
	});

	it("sets a high carton from the low position, and low from the high one", () => {
		const low = setup();
		expect(heightSwitch()).toHaveAttribute("aria-checked", "false");
		fireEvent.click(heightSwitch());
		expect(low.send).toHaveBeenCalledWith({
			type: "setCartonHigh",
			high: true,
		});
		low.unmount();

		const high = setup({
			state: { ...CartonSortingModel.createState(), cartonHigh: true },
		});
		expect(heightSwitch()).toHaveAttribute("aria-checked", "true");
		fireEvent.click(heightSwitch());
		expect(high.send).toHaveBeenCalledWith({
			type: "setCartonHigh",
			high: false,
		});
	});

	it("disables both controls when the simulation is not running", () => {
		const { send } = setup({ interactive: false });
		expect(placeButton()).toBeDisabled();
		expect(heightSwitch()).toBeDisabled();
		fireEvent.click(placeButton());
		fireEvent.click(heightSwitch());
		expect(send).not.toHaveBeenCalled();
	});

	it("shows the controls in their rest position while the scene has no state", () => {
		setup({ state: null });
		expect(placeButton()).toBeEnabled();
		expect(heightSwitch()).toHaveAttribute("aria-checked", "false");
	});

	describe("start button", () => {
		it("sends a press when the button goes down and a release when it goes up", () => {
			const { send } = setup();
			fireEvent.pointerDown(startButton(), { button: 0 });
			expect(send).toHaveBeenLastCalledWith({ type: "pressStart" });
			fireEvent.pointerUp(startButton());
			expect(send).toHaveBeenLastCalledWith({ type: "releaseStart" });
			expect(send).toHaveBeenCalledTimes(2);
		});

		it("releases when the pointer leaves the button, and only once", () => {
			const { send } = setup();
			fireEvent.pointerDown(startButton(), { button: 0 });
			fireEvent.pointerLeave(startButton());
			fireEvent.pointerUp(startButton());
			expect(send.mock.calls.map(([interaction]) => interaction)).toEqual([
				{ type: "pressStart" },
				{ type: "releaseStart" },
			]);
		});

		it("does not send a release for a button that was never pressed", () => {
			const { send } = setup();
			fireEvent.pointerLeave(startButton());
			fireEvent.blur(startButton());
			expect(send).not.toHaveBeenCalled();
		});

		it("ignores a secondary mouse button", () => {
			const { send } = setup();
			fireEvent.pointerDown(startButton(), { button: 2 });
			expect(send).not.toHaveBeenCalled();
		});

		it("can be operated from the keyboard, without repeating while held", () => {
			const { send } = setup();
			fireEvent.keyDown(startButton(), { key: " " });
			fireEvent.keyDown(startButton(), { key: " ", repeat: true });
			fireEvent.keyUp(startButton(), { key: " " });
			expect(send.mock.calls.map(([interaction]) => interaction)).toEqual([
				{ type: "pressStart" },
				{ type: "releaseStart" },
			]);
		});

		it("is disabled when the simulation is not running", () => {
			const { send } = setup({ interactive: false });
			expect(startButton()).toBeDisabled();
			fireEvent.pointerDown(startButton(), { button: 0 });
			expect(send).not.toHaveBeenCalled();
		});

		describe("when the simulation stops while the button is held", () => {
			const rerenderWith = (
				view: ReturnType<typeof setup>,
				send: jest.Mock,
				interactive: boolean,
			) =>
				view.rerender(
					<CartonSortingControls
						sample={() => CartonSortingModel.createState()}
						interactive={interactive}
						send={send}
					/>,
				);

			it("presses again after a restart, without sending a release for the lost press", () => {
				const view = setup();
				const { send } = view;
				fireEvent.pointerDown(startButton(), { button: 0 });
				rerenderWith(view, send, false);
				rerenderWith(view, send, true);
				fireEvent.pointerDown(startButton(), { button: 0 });
				expect(send.mock.calls.map(([interaction]) => interaction)).toEqual([
					{ type: "pressStart" },
					{ type: "pressStart" },
				]);
			});

			it("still sends a press then a release for a normal press afterwards", () => {
				const view = setup();
				const { send } = view;
				fireEvent.pointerDown(startButton(), { button: 0 });
				rerenderWith(view, send, false);
				rerenderWith(view, send, true);
				send.mockClear();
				fireEvent.pointerDown(startButton(), { button: 0 });
				fireEvent.pointerUp(startButton());
				expect(send.mock.calls.map(([interaction]) => interaction)).toEqual([
					{ type: "pressStart" },
					{ type: "releaseStart" },
				]);
			});
		});
	});

	describe("counter", () => {
		it("shows the value of the counter variable", () => {
			setup({ state: { ...CartonSortingModel.createState(), counter: 7 } });
			expect(screen.getByRole("status")).toHaveTextContent("7");
		});

		it("shows a dash while the counter is not known", () => {
			setup();
			expect(screen.getByRole("status")).toHaveTextContent("-");
		});

		it("shows zero as a value, not as a missing one", () => {
			setup({ state: { ...CartonSortingModel.createState(), counter: 0 } });
			expect(screen.getByRole("status")).toHaveTextContent("0");
		});
	});
});
