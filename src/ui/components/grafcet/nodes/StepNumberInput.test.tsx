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
	it("a une hauteur fixe de 15px, qui laisse un renvoi de 40px avec son espace de 5px et sa flèche de 20px", () => {
		const { input } = setup();

		expect(input).toHaveStyle({ height: "15px" });
		expect(15 + 5 + 20).toBe(40);
	});

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

	it("laisse passer 0 et 9 et bloque les caractères voisins dans la table ASCII", () => {
		const { input } = setup();

		expect(fireEvent.keyDown(input, { key: "0" })).toBe(true);
		expect(fireEvent.keyDown(input, { key: "9" })).toBe(true);
		expect(fireEvent.keyDown(input, { key: "/" })).toBe(false);
		expect(fireEvent.keyDown(input, { key: ":" })).toBe(false);
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
