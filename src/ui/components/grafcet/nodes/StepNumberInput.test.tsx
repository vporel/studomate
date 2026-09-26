/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import StepNumberInput from "./StepNumberInput";

function setup({ editing = true } = {}) {
	const onChange = jest.fn();
	const onCommit = jest.fn();
	const inputRef = createRef<HTMLInputElement>();
	render(
		<StepNumberInput
			inputRef={inputRef}
			className="custom"
			value="12"
			editing={editing}
			onChange={onChange}
			onCommit={onCommit}
		/>,
	);
	return { input: screen.getByRole("textbox"), onChange, onCommit };
}

describe("StepNumberInput", () => {
	it("porte la classe fournie et la valeur", () => {
		const { input } = setup();

		expect(input).toHaveClass("node__input", "custom", "nodrag");
		expect(input).toHaveValue("12");
	});

	it("remonte la saisie", () => {
		const { input, onChange } = setup();

		fireEvent.change(input, { target: { value: "45" } });

		expect(onChange).toHaveBeenCalledWith("45");
	});

	it("bloque les caractères non numériques mais laisse passer les chiffres", () => {
		const { input } = setup();

		expect(fireEvent.keyDown(input, { key: "a" })).toBe(false);
		expect(fireEvent.keyDown(input, { key: "7" })).toBe(true);
		expect(fireEvent.keyDown(input, { key: "Backspace" })).toBe(true);
	});

	it.each(["Enter", "Escape"])(
		"%s fait perdre le focus et déclenche la sauvegarde",
		(key) => {
			const { input, onCommit } = setup();
			input.focus();

			fireEvent.keyDown(input, { key });

			expect(input).not.toHaveFocus();
			expect(onCommit).toHaveBeenCalledTimes(1);
		},
	);

	it("n'accepte les événements pointeur que pendant l'édition", () => {
		expect(setup({ editing: true }).input).toHaveStyle({
			pointerEvents: "all",
		});
	});

	it("ignore le pointeur hors édition", () => {
		expect(setup({ editing: false }).input).toHaveStyle({
			pointerEvents: "none",
		});
	});
});
