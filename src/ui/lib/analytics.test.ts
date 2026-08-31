/**
 * @jest-environment jsdom
 */
import trackEvent from "./analytics";

describe("trackEvent", () => {
	afterEach(() => {
		delete window.umami;
	});

	it("transmet l'événement à Umami quand il est présent", () => {
		const track = jest.fn();
		window.umami = { track };

		trackEvent("simulation-started", { mode: "continuous" });

		expect(track).toHaveBeenCalledWith("simulation-started", {
			mode: "continuous",
		});
	});

	it("ne jette pas quand Umami est absent", () => {
		expect(() => trackEvent("project-created")).not.toThrow();
	});
});
