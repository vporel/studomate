/** @jest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import AppTool from "./AppTool";

function setup(props: { disabled?: boolean; onClick?: () => void } = {}) {
	render(
		<AppTool name="demo" label="Demo" {...props}>
			<span>icon</span>
		</AppTool>,
	);
	return screen.getByRole("button", { name: "Demo" });
}

describe("AppTool", () => {
	it("exposes a focusable button with the label and name-based class", () => {
		const button = setup();
		expect(button).toHaveAttribute("tabindex", "0");
		expect(button).toHaveClass("app-toolbar__demo");
		expect(button).not.toHaveClass("app-toolbar__tool--disabled");
		expect(screen.getByText("icon")).toBeInTheDocument();
	});

	it("calls onClick on click", () => {
		const onClick = jest.fn();
		fireEvent.click(setup({ onClick }));
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it.each(["Enter", " "])("activates with the %j key", (key) => {
		const onClick = jest.fn();
		fireEvent.keyDown(setup({ onClick }), { key });
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("ignores other keys", () => {
		const onClick = jest.fn();
		fireEvent.keyDown(setup({ onClick }), { key: "a" });
		expect(onClick).not.toHaveBeenCalled();
	});

	it("is marked disabled and ignores click and keyboard when disabled", () => {
		const onClick = jest.fn();
		const button = setup({ disabled: true, onClick });
		expect(button).toHaveAttribute("aria-disabled", "true");
		expect(button).toHaveClass("app-toolbar__tool--disabled");
		fireEvent.click(button);
		fireEvent.keyDown(button, { key: "Enter" });
		expect(onClick).not.toHaveBeenCalled();
	});

	it("does not throw when clicked without onClick", () => {
		expect(() => fireEvent.click(setup())).not.toThrow();
	});
});
