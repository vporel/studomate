/** @jest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import {
	CONSOLE_BUTTON_SIZE,
	LampWithLegend,
	PushButtonIllustration,
	StartHoldButton,
} from "./ConsoleParts";

describe("PushButtonIllustration", () => {
	it("is drawn at the size of a console button", () => {
		const { container } = render(
			<PushButtonIllustration
				color="#2e7d32"
				pressed={false}
				disabled={false}
			/>,
		);
		const svg = container.querySelector("svg")!;
		expect(CONSOLE_BUTTON_SIZE).toBe(55);
		expect(svg).toHaveAttribute("width", "55");
		expect(svg).toHaveAttribute("height", "55");
	});
});

describe("LampWithLegend", () => {
	it("shows the label next to a lamp carrying the same label", () => {
		render(<LampWithLegend on color="#ef6c00" label="Descente" />);

		expect(screen.getByRole("img", { name: "Descente" })).toHaveAttribute(
			"data-lit",
			"true",
		);
		expect(screen.getByText("Descente")).toBeInTheDocument();
	});

	it("leaves the lamp unlit when off", () => {
		render(<LampWithLegend on={false} color="#ef6c00" label="Montée" />);

		expect(screen.getByRole("img", { name: "Montée" })).toHaveAttribute(
			"data-lit",
			"false",
		);
	});
});

describe("StartHoldButton", () => {
	beforeAll(() => {
		window.PointerEvent ??= MouseEvent as unknown as typeof PointerEvent;
	});

	function setup(interactive = true) {
		const send = jest.fn();
		const view = render(
			<StartHoldButton
				interactive={interactive}
				pressed={false}
				label="Démarrer"
				send={send}
			/>,
		);
		const rerender = (next: boolean) =>
			view.rerender(
				<StartHoldButton
					interactive={next}
					pressed={false}
					label="Démarrer"
					send={send}
				/>,
			);
		return { send, button: screen.getByRole("button"), rerender };
	}

	it("sends a press then a release with the main pointer button", () => {
		const { send, button } = setup();

		fireEvent.pointerDown(button, { button: 0 });
		fireEvent.pointerUp(button);

		expect(send).toHaveBeenNthCalledWith(1, { type: "pressStart" });
		expect(send).toHaveBeenNthCalledWith(2, { type: "releaseStart" });
	});

	it("ignores the other pointer buttons", () => {
		const { send, button } = setup();

		fireEvent.pointerDown(button, { button: 2 });

		expect(send).not.toHaveBeenCalled();
	});

	it.each([" ", "Enter"])("is held and released with the %p key", (key) => {
		const { send, button } = setup();

		fireEvent.keyDown(button, { key });
		fireEvent.keyUp(button, { key });

		expect(send).toHaveBeenNthCalledWith(1, { type: "pressStart" });
		expect(send).toHaveBeenNthCalledWith(2, { type: "releaseStart" });
	});

	it.each(["pointerLeave", "pointerCancel", "blur"] as const)(
		"releases on %s",
		(event) => {
			const { send, button } = setup();

			fireEvent.pointerDown(button, { button: 0 });
			fireEvent[event](button);

			expect(send).toHaveBeenLastCalledWith({ type: "releaseStart" });
		},
	);

	it("sends the press once while held and nothing for a release without a press", () => {
		const { send, button } = setup();

		fireEvent.pointerUp(button);
		expect(send).not.toHaveBeenCalled();

		fireEvent.pointerDown(button, { button: 0 });
		fireEvent.keyDown(button, { key: " " });
		fireEvent.pointerUp(button);
		fireEvent.pointerUp(button);

		expect(send).toHaveBeenCalledTimes(2);
	});

	it("is disabled and sends nothing when not interactive", () => {
		const { send, button } = setup(false);

		expect(button).toBeDisabled();
		fireEvent.keyDown(button, { key: "Enter" });

		expect(send).not.toHaveBeenCalled();
	});

	it("forgets a held press when it stops being interactive", () => {
		const { send, button, rerender } = setup();
		fireEvent.pointerDown(button, { button: 0 });

		rerender(false);
		rerender(true);
		fireEvent.pointerDown(screen.getByRole("button"), { button: 0 });

		expect(send).toHaveBeenNthCalledWith(1, { type: "pressStart" });
		expect(send).toHaveBeenNthCalledWith(2, { type: "pressStart" });
	});
});
