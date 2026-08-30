/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import HeroCarousel from "./HeroCarousel";

const slides = [
	{ src: "/a.png", alt: "Vue A" },
	{ src: "/b.png", alt: "Vue B" },
];

describe("HeroCarousel", () => {
	it("affiche toutes les images, la première visible", () => {
		render(<HeroCarousel slides={slides} />);
		expect(screen.getByAltText("Vue A")).toHaveAttribute("aria-hidden", "false");
		expect(screen.getByAltText("Vue B")).toHaveAttribute("aria-hidden", "true");
	});

	it("change d'image via les puces", () => {
		render(<HeroCarousel slides={slides} />);
		fireEvent.click(screen.getByRole("button", { name: /aller à l'image 2/i }));
		expect(screen.getByAltText("Vue B")).toHaveAttribute("aria-hidden", "false");
	});

	it("boucle avec le bouton suivant", () => {
		render(<HeroCarousel slides={slides} />);
		fireEvent.click(screen.getByRole("button", { name: /image suivante/i }));
		fireEvent.click(screen.getByRole("button", { name: /image suivante/i }));
		expect(screen.getByAltText("Vue A")).toHaveAttribute("aria-hidden", "false");
	});

	it("n'affiche pas les contrôles avec une seule image", () => {
		render(<HeroCarousel slides={[slides[0]]} />);
		expect(
			screen.queryByRole("button", { name: /image suivante/i }),
		).not.toBeInTheDocument();
	});
});
