/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import DemoVideo from "./DemoVideo";

const mockReducedMotion = (reduce: boolean) => {
	window.matchMedia = jest.fn().mockReturnValue({ matches: reduce });
};

describe("DemoVideo", () => {
	let play: jest.SpyInstance;
	let pause: jest.SpyInstance;

	beforeEach(() => {
		play = jest
			.spyOn(HTMLMediaElement.prototype, "play")
			.mockImplementation(function (this: HTMLMediaElement) {
				this.dispatchEvent(new Event("play"));
				return Promise.resolve();
			});
		pause = jest
			.spyOn(HTMLMediaElement.prototype, "pause")
			.mockImplementation(function (this: HTMLMediaElement) {
				this.dispatchEvent(new Event("pause"));
			});
	});

	afterEach(() => jest.restoreAllMocks());

	const renderVideo = () =>
		renderWithI18n(<DemoVideo src="/videos/demo.mp4" label="Démo" />);
	const video = () => screen.getByLabelText("Démo") as HTMLVideoElement;

	it("démarre seule, muette, en boucle et sans barre de contrôle native", () => {
		mockReducedMotion(false);
		renderVideo();

		expect(play).toHaveBeenCalledTimes(1);
		expect(video().muted).toBe(true);
		expect(video().loop).toBe(true);
		expect(video().controls).toBe(false);
		expect(
			screen.getByRole("button", { name: /mettre la démonstration en pause/i }),
		).toBeInTheDocument();
	});

	it("réserve sa hauteur avant le chargement grâce à ses dimensions intrinsèques", () => {
		mockReducedMotion(false);
		renderVideo();

		expect(video()).toHaveAttribute("width", "1152");
		expect(video()).toHaveAttribute("height", "720");
	});

	it("ne démarre pas si le visiteur demande à réduire les animations", () => {
		mockReducedMotion(true);
		renderVideo();

		expect(play).not.toHaveBeenCalled();
		expect(
			screen.getByRole("button", { name: /lire la démonstration/i }),
		).toBeInTheDocument();
	});

	it("bascule entre pause et lecture avec le bouton", () => {
		mockReducedMotion(false);
		renderVideo();

		fireEvent.click(
			screen.getByRole("button", { name: /mettre la démonstration en pause/i }),
		);
		expect(pause).toHaveBeenCalledTimes(1);
		const playButton = screen.getByRole("button", {
			name: /lire la démonstration/i,
		});

		fireEvent.click(playButton);
		expect(play).toHaveBeenCalledTimes(2);
		expect(
			screen.getByRole("button", { name: /mettre la démonstration en pause/i }),
		).toBeInTheDocument();
	});
});
