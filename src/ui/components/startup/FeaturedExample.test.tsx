/**
 * @jest-environment jsdom
 */
import { screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import FeaturedExample from "./FeaturedExample";
import { listStartupExamples } from "./startup-examples";

jest.mock("@/ui/components/3d-illustrations/Illustration3dSlot", () => ({
	__esModule: true,
	isIllustration3dId: (id: string) => id === "crossroads",
	default: ({ fallback }: { fallback: React.ReactNode }) => (
		<div data-testid="illustration-slot">{fallback}</div>
	),
}));

const exampleOf = (id: string) => {
	const example = listStartupExamples().find((e) => e.id === id);
	if (!example) throw new Error(`no example ${id}`);
	return example;
};

describe("FeaturedExample", () => {
	it("anime l'exemple quand une illustration 3D existe, avec l'image de la scène en repli", () => {
		const { container } = renderWithI18n(
			<FeaturedExample example={exampleOf("crossroads")} onOpen={jest.fn()} />,
		);
		const slot = screen.getByTestId("illustration-slot");
		expect(slot.querySelector("img")).toHaveAttribute(
			"src",
			"/images/scenes-3d/crossroads.png",
		);
		expect(container.querySelectorAll("img")).toHaveLength(1);
	});

	it("se contente de l'image de la scène sans illustration 3D", () => {
		const { container } = renderWithI18n(
			<FeaturedExample example={exampleOf("drilling")} onOpen={jest.fn()} />,
		);
		expect(screen.queryByTestId("illustration-slot")).not.toBeInTheDocument();
		expect(container.querySelector("img")).toHaveAttribute(
			"src",
			"/images/scenes-3d/drilling.png",
		);
	});

	it("résume le contenu de la solution", () => {
		renderWithI18n(
			<FeaturedExample example={exampleOf("crossroads")} onOpen={jest.fn()} />,
		);
		expect(screen.getByText(/Scène 3D/)).toBeInTheDocument();
	});
});
