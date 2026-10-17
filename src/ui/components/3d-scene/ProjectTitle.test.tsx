/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import ProjectTitle from "./ProjectTitle";

describe("ProjectTitle", () => {
	it("shows the project name in capitals, whatever its case", () => {
		render(<ProjectTitle name="Poste de tri" />);
		const title = screen.getByText("Poste de tri");
		expect(title).toHaveStyle({ textTransform: "uppercase" });
	});

	it("keeps the full name available when it is truncated", () => {
		render(<ProjectTitle name="Un nom de projet très très long" />);
		expect(screen.getByTitle("Un nom de projet très très long")).toBeTruthy();
	});

	it("renders nothing without a project name", () => {
		const { container, rerender } = render(<ProjectTitle name={null} />);
		expect(container).toBeEmptyDOMElement();
		rerender(<ProjectTitle name="" />);
		expect(container).toBeEmptyDOMElement();
	});
});
