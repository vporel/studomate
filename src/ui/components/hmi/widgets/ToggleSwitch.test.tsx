/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { ToggleSwitchData } from "@/schemas/hmi/hmi-widget.schema";
import ToggleSwitch from "./ToggleSwitch";

function setup(data: Partial<ToggleSwitchData>, value: boolean | undefined) {
	const onValueChange = jest.fn();
	render(
		<ToggleSwitch
			data={{ variable: "s", label: "S", ...data }}
			value={value}
			onValueChange={onValueChange}
		/>,
	);
	const root = screen.getByText("S").parentElement!;
	return { onValueChange, root, track: root.firstElementChild as HTMLElement };
}

describe("ToggleSwitch — simulation", () => {
	it("contact NO (défaut) : actionné quand la variable vaut VRAI, le clic inverse la valeur", () => {
		const { onValueChange, root, track } = setup({}, false);
		expect(track).toHaveStyle({ justifyContent: "flex-start" });

		fireEvent.click(root);

		expect(onValueChange).toHaveBeenCalledWith(true);
	});

	it("contact NF : au repos quand la variable vaut VRAI, l'actionner écrit FAUX", () => {
		const { onValueChange, root, track } = setup({ contact: "nc" }, true);
		expect(track).toHaveStyle({ justifyContent: "flex-start" });

		fireEvent.click(root);

		expect(onValueChange).toHaveBeenCalledWith(false);
	});

	it("contact NF : actionné quand la variable vaut FAUX", () => {
		const { track } = setup({ contact: "nc" }, false);

		expect(track).toHaveStyle({ justifyContent: "flex-end" });
	});

	it("contact NF : au repos hors simulation (valeur inconnue)", () => {
		const { track } = setup({ contact: "nc" }, undefined);

		expect(track).toHaveStyle({ justifyContent: "flex-start" });
	});
});
