/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { PushButtonData } from "@/schemas/hmi/hmi-widget.schema";
import PushButton from "./PushButton";

function setup(data: Partial<PushButtonData>, value: boolean | undefined) {
	const onValueChange = jest.fn();
	const onTrigger = jest.fn();
	render(
		<PushButton
			data={{ variable: "bp", label: "BP", ...data }}
			value={value}
			onValueChange={onValueChange}
			onTrigger={onTrigger}
		/>,
	);
	return { onValueChange, onTrigger, button: screen.getByText("BP").parentElement! };
}

describe("PushButton — simulation", () => {
	it("momentary-no (défaut) : VRAI à l'appui, FAUX au relâchement", () => {
		const { onValueChange, onTrigger, button } = setup({}, false);

		fireEvent.mouseDown(button);
		fireEvent.mouseUp(button);

		expect(onValueChange.mock.calls).toEqual([[true], [false]]);
		expect(onTrigger).toHaveBeenCalledWith("onPress");
	});

	it("momentary-nc : FAUX à l'appui, VRAI au relâchement", () => {
		const { onValueChange, button } = setup({ behavior: "momentary-nc" }, true);

		fireEvent.mouseDown(button);
		fireEvent.mouseLeave(button);

		expect(onValueChange.mock.calls).toEqual([[false], [true]]);
	});

	it("momentary-nc : paraît enfoncé quand la variable vaut FAUX", () => {
		const { button } = setup({ behavior: "momentary-nc" }, false);

		expect(button).toHaveStyle({ backgroundColor: "#1976d2" });
	});

	it("set : une écriture à l'appui, rien au relâchement", () => {
		const { onValueChange, button } = setup({ behavior: "set" }, false);

		fireEvent.mouseDown(button);
		fireEvent.mouseUp(button);

		expect(onValueChange.mock.calls).toEqual([[true]]);
	});

	it("toggle : inverse la valeur courante", () => {
		const { onValueChange, button } = setup({ behavior: "toggle" }, true);

		fireEvent.mouseDown(button);

		expect(onValueChange).toHaveBeenCalledWith(false);
	});

	it("momentary-nc : paraît au repos hors simulation (valeur inconnue)", () => {
		const { button } = setup({ behavior: "momentary-nc" }, undefined);

		expect(button).toHaveStyle({ backgroundColor: "#e0e0e0" });
	});
});
