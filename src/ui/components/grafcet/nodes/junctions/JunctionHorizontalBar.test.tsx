/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import JunctionHorizontalBar from "./JunctionHorizontalBar";

describe("JunctionHorizontalBar", () => {
	it("applique l'épaisseur et la couleur", () => {
		const { container } = render(
			<JunctionHorizontalBar color="rgb(1, 2, 3)" thickness="2px" />,
		);

		expect(container.firstChild).toHaveStyle({
			width: "100%",
			height: "2px",
			background: "rgb(1, 2, 3)",
		});
	});

	it("applique marginTop quand il est fourni", () => {
		const { container } = render(
			<JunctionHorizontalBar color="black" thickness="1px" marginTop="3px" />,
		);

		expect(container.firstChild).toHaveStyle({ marginTop: "3px" });
	});

	it("n'a pas de marge par défaut", () => {
		const { container } = render(
			<JunctionHorizontalBar color="black" thickness="1px" />,
		);

		expect(container.firstChild).not.toHaveStyle({ marginTop: "3px" });
	});
});
