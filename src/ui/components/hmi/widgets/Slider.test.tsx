/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { SliderData } from "@/schemas/hmi/hmi-widget.schema";
import Slider, { stepDecimals } from "./Slider";

function setup(
	data: Partial<SliderData>,
	value: number | undefined,
	{ simulation = true }: { simulation?: boolean } = {},
) {
	const onValueChange = jest.fn();
	const onClick = jest.fn();
	render(
		<Slider
			data={{ variable: "niveau", label: "Niveau", min: 0, max: 100, ...data }}
			value={value}
			onValueChange={simulation ? onValueChange : undefined}
			onClick={simulation ? undefined : onClick}
		/>,
	);
	return { onValueChange, onClick, input: screen.getByRole("slider") };
}

describe("stepDecimals", () => {
	it("compte les décimales du pas", () => {
		expect(stepDecimals(1)).toBe(0);
		expect(stepDecimals(0.1)).toBe(1);
		expect(stepDecimals(0.25)).toBe(2);
	});
});

describe("Slider : simulation", () => {
	it("écrit la nouvelle valeur dans la variable à chaque déplacement du curseur", () => {
		const { onValueChange, input } = setup({ step: 5 }, 10);

		fireEvent.keyDown(input, { key: "ArrowRight" });

		expect(onValueChange).toHaveBeenCalledWith(15);
	});

	it("affiche toujours la valeur courante de la variable", () => {
		setup({}, 42);

		expect(screen.getByText("42")).toBeInTheDocument();
	});

	it("arrondit la valeur affichée à la précision du pas", () => {
		setup({ step: 0.1 }, 0.1 + 0.2);

		expect(screen.getByText("0.3")).toBeInTheDocument();
	});

	it("retombe sur un pas de 1 quand le pas n'est pas strictement positif", () => {
		const { onValueChange, input } = setup({ step: 0 }, 10);

		fireEvent.keyDown(input, { key: "ArrowRight" });

		expect(onValueChange).toHaveBeenCalledWith(11);
	});

	it("oriente le curseur verticalement", () => {
		const { input } = setup({ style: { orientation: "vertical" } }, 10);

		expect(input).toHaveAttribute("aria-orientation", "vertical");
	});
});

describe("Slider : conception", () => {
	it("affiche 0 ramené dans la plage quand aucune valeur n'est connue", () => {
		setup({ min: 20, max: 80 }, undefined, { simulation: false });

		expect(screen.getByText("20")).toBeInTheDocument();
	});

	it("laisse le clic atteindre le widget pour le sélectionner", () => {
		const { onClick, input } = setup({}, undefined, { simulation: false });

		fireEvent.click(screen.getByText("Niveau"));

		expect(onClick).toHaveBeenCalled();
		expect(input.closest("[class*=MuiSlider-root]")!.parentElement).toHaveStyle({
			pointerEvents: "none",
		});
	});
});
