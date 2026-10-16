/**
 * @jest-environment jsdom
 */
import { act, render, screen } from "@testing-library/react";
import HeroSceneSlot from "./HeroSceneSlot";

jest.mock("./HeroScene", () => ({
	__esModule: true,
	default: ({ paused }: { paused: boolean }) => (
		<div data-testid="hero-scene" data-paused={String(paused)} />
	),
}));

let intersect: (isIntersecting: boolean) => void = () => {};

const setEnvironment = ({
	wide = true,
	reducedMotion = false,
	webGl = true,
}: { wide?: boolean; reducedMotion?: boolean; webGl?: boolean } = {}) => {
	window.matchMedia = jest.fn((query: string) => ({
		matches: query.includes("min-width") ? wide : reducedMotion,
	})) as unknown as typeof window.matchMedia;
	jest
		.spyOn(HTMLCanvasElement.prototype, "getContext")
		.mockReturnValue((webGl ? {} : null) as never);
};

beforeEach(() => {
	window.IntersectionObserver = jest.fn(
		(callback: IntersectionObserverCallback) => {
			intersect = (isIntersecting) =>
				callback(
					[{ isIntersecting } as IntersectionObserverEntry],
					{} as IntersectionObserver,
				);
			return { observe: jest.fn(), disconnect: jest.fn() };
		},
	) as unknown as typeof IntersectionObserver;
});

afterEach(() => jest.restoreAllMocks());

const renderSlot = () => render(<HeroSceneSlot label="Poste de tri" />);

describe("HeroSceneSlot", () => {
	it("charge la scène animée sur grand écran, avec WebGL et sans préférence de mouvement réduit", async () => {
		setEnvironment();
		renderSlot();

		expect(await screen.findByTestId("hero-scene")).toHaveAttribute(
			"data-paused",
			"false",
		);
		expect(
			screen.getByRole("img", { name: "Poste de tri" }),
		).toBeInTheDocument();
	});

	it.each([
		["un écran étroit", { wide: false }],
		["une préférence de mouvement réduit", { reducedMotion: true }],
		["l'absence de WebGL", { webGl: false }],
	])("n'affiche rien derrière le texte avec %s", (_, environment) => {
		setEnvironment(environment);
		const { container } = renderSlot();

		expect(screen.queryByTestId("hero-scene")).not.toBeInTheDocument();
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
		expect(container.querySelector("img")).toBeNull();
	});

	it("met la scène en pause tant qu'elle est hors de l'écran", async () => {
		setEnvironment();
		renderSlot();
		const scene = await screen.findByTestId("hero-scene");

		act(() => intersect(false));
		expect(scene).toHaveAttribute("data-paused", "true");
		act(() => intersect(true));
		expect(scene).toHaveAttribute("data-paused", "false");
	});

	it("met la scène en pause tant que l'onglet est masqué", async () => {
		setEnvironment();
		renderSlot();
		const scene = await screen.findByTestId("hero-scene");

		Object.defineProperty(document, "visibilityState", {
			value: "hidden",
			configurable: true,
		});
		act(() => {
			document.dispatchEvent(new Event("visibilitychange"));
		});
		expect(scene).toHaveAttribute("data-paused", "true");

		Object.defineProperty(document, "visibilityState", {
			value: "visible",
			configurable: true,
		});
		act(() => {
			document.dispatchEvent(new Event("visibilitychange"));
		});
		expect(scene).toHaveAttribute("data-paused", "false");
	});
});
