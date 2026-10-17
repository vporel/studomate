/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { NumericInputData } from "@/schemas/hmi/hmi-widget.schema";
import NumericInput from "./NumericInput";

function setup(data: Partial<NumericInputData>, value = 10) {
	const onValueChange = jest.fn();
	render(
		<NumericInput
			data={{ variable: "consigne", label: "Consigne", ...data }}
			value={value}
			onValueChange={onValueChange}
		/>,
	);
	return { onValueChange, input: screen.getByRole("spinbutton") };
}

const commit = (input: HTMLElement, text: string) => {
	fireEvent.change(input, { target: { value: text } });
	fireEvent.blur(input);
};

describe("NumericInput : validation de la saisie", () => {
	it("écrit une valeur comprise dans les bornes", () => {
		const { onValueChange, input } = setup({ min: 0, max: 100 });

		commit(input, "42");

		expect(onValueChange).toHaveBeenCalledWith(42);
	});

	it("ramène une valeur trop grande au maximum", () => {
		const { onValueChange, input } = setup({ min: 0, max: 100 });

		commit(input, "500");

		expect(onValueChange).toHaveBeenCalledWith(100);
		expect(input).toHaveValue(100);
	});

	it("ramène une valeur trop petite au minimum", () => {
		const { onValueChange, input } = setup({ min: 5, max: 100 });

		commit(input, "-3");

		expect(onValueChange).toHaveBeenCalledWith(5);
	});

	it("utilise 0 et 100 quand les bornes ne sont pas définies", () => {
		const { onValueChange, input } = setup({});

		commit(input, "250");

		expect(onValueChange).toHaveBeenCalledWith(100);
	});

	it("laisse le minimum l'emporter quand les bornes sont inversées", () => {
		const { onValueChange, input } = setup({ min: 50, max: 10 });

		commit(input, "30");

		expect(onValueChange).toHaveBeenCalledWith(50);
	});

	it("traite une saisie vide comme 0 (borné par min)", () => {
		const { onValueChange, input } = setup({ min: 0, max: 100 }, 10);

		commit(input, "");

		expect(onValueChange).toHaveBeenCalledWith(0);
	});
});
