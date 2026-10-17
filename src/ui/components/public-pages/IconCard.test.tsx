/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import IconCard from "./IconCard";

const Icon = () => <svg data-testid="icon" />;

describe("IconCard", () => {
	it("renders the icon, the title as a heading and the text", () => {
		render(
			<IconCard icon={Icon} title="Titre">
				Texte
			</IconCard>,
		);

		expect(screen.getByTestId("icon")).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Titre" })).toBeTruthy();
		expect(screen.getByText("Texte")).toBeTruthy();
	});

	it("renders no image by default", () => {
		const { container } = render(
			<IconCard icon={Icon} title="Titre">
				Texte
			</IconCard>,
		);

		expect(container.querySelector("img")).toBeNull();
	});

	it("renders the header image with its alt text", () => {
		render(
			<IconCard
				icon={Icon}
				title="Titre"
				image={{ src: "/a.png", alt: "Aperçu" }}
			>
				Texte
			</IconCard>,
		);

		expect(screen.getByAltText("Aperçu").getAttribute("src")).toBe("/a.png");
	});
});
