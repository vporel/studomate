/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import HmiWidgetLabel from "./HmiWidgetLabel";

describe("HmiWidgetLabel", () => {
	it("affiche le libellé", () => {
		render(<HmiWidgetLabel label="Pompe" />);

		expect(screen.getByText("Pompe")).toBeInTheDocument();
	});

	it("n'affiche rien quand il est masqué", () => {
		const { container } = render(<HmiWidgetLabel label="Pompe" hidden />);

		expect(container).toBeEmptyDOMElement();
	});

	it.each([undefined, ""])("n'affiche rien pour le libellé %p", (label) => {
		const { container } = render(<HmiWidgetLabel label={label} />);

		expect(container).toBeEmptyDOMElement();
	});
});
