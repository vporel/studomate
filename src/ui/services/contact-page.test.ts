/**
 * @jest-environment jsdom
 */
import {
	contactPageUrl,
	openContactPage,
	openReportIssue,
} from "./contact-page";

describe("contactPageUrl", () => {
	it("leaves the French page without prefix and prefixes the English one", () => {
		expect(contactPageUrl("fr")).toBe("/contact");
		expect(contactPageUrl("en")).toBe("/en/contact");
	});

	it("carries the topic in the query string", () => {
		expect(contactPageUrl("fr", "forgotten-password")).toBe(
			"/contact?topic=forgotten-password",
		);
		expect(contactPageUrl("en", "problem")).toBe("/en/contact?topic=problem");
	});
});

describe("openContactPage / openReportIssue", () => {
	afterEach(() => {
		delete window.umami;
		jest.restoreAllMocks();
	});

	it("opens the contact page in a new tab", () => {
		const open = jest.spyOn(window, "open").mockImplementation(() => null);

		openContactPage("en", "forgotten-password");

		expect(open).toHaveBeenCalledWith(
			"/en/contact?topic=forgotten-password",
			"_blank",
			"noopener",
		);
	});

	it("records the event and opens the page on the problem topic", () => {
		const track = jest.fn();
		window.umami = { track };
		const open = jest.spyOn(window, "open").mockImplementation(() => null);

		openReportIssue("fr");

		expect(track).toHaveBeenCalledWith("feedback-opened", undefined);
		expect(open).toHaveBeenCalledWith(
			"/contact?topic=problem",
			"_blank",
			"noopener",
		);
	});
});
