/**
 * @jest-environment jsdom
 */
import {
	getLanguageSuggestionDismissed,
	getPreferredLocale,
	setLanguageSuggestionDismissed,
	setPreferredLocale,
} from "@/persistence/preferences.storage";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import LanguageSuggestionBanner from "./LanguageSuggestionBanner";

let mockPathname = "/about";
let mockParams: Record<string, string> = {};
jest.mock("@/i18n/navigation", () => ({
	...jest.requireActual("@/i18n/navigation"),
	usePathname: () => mockPathname,
}));
jest.mock("next/navigation", () => ({
	...jest.requireActual("next/navigation"),
	useParams: () => mockParams,
}));
function setBrowserLanguages(languages: string[]) {
	Object.defineProperty(navigator, "language", {
		value: languages[0],
		configurable: true,
	});
	Object.defineProperty(navigator, "languages", {
		value: languages,
		configurable: true,
	});
}

const renderBanner = () =>
	renderWithI18n(
		<LanguageSuggestionBanner
			targetLocale="en"
			message="This page is also available in English."
			action="View in English"
			dismiss="Close"
		/>,
	);

describe("LanguageSuggestionBanner", () => {
	beforeEach(() => {
		localStorage.clear();
		mockPathname = "/about";
		mockParams = {};
		setBrowserLanguages(["en-US"]);
	});

	it("proposes the page in the target language when the browser asks for it", () => {
		renderBanner();

		expect(
			screen.getByText("This page is also available in English."),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "View in English" }),
		).toHaveAttribute("href", "/en/about");
	});

	it("points to the translated slug of the page", () => {
		mockPathname = "/contact";
		renderBanner();

		expect(
			screen.getByRole("link", { name: "View in English" }),
		).toHaveAttribute("href", "/en/contact");
	});

	it("translates the slug of a dynamic page (manual section)", () => {
		mockPathname = "/user-manual/[section]";
		mockParams = { locale: "fr", section: "depannage" };
		renderBanner();

		expect(
			screen.getByRole("link", { name: "View in English" }),
		).toHaveAttribute("href", "/en/user-manual/troubleshooting");
	});

	it("falls back to the home page on an unknown dynamic slug", () => {
		mockPathname = "/user-manual/[section]";
		mockParams = { locale: "fr", section: "inconnu" };
		renderBanner();

		expect(
			screen.getByRole("link", { name: "View in English" }),
		).toHaveAttribute("href", "/en");
	});

	it("also appears for a browser in an unsupported language (falls back to English)", () => {
		setBrowserLanguages(["de-DE"]);
		renderBanner();

		expect(screen.getByRole("link", { name: "View in English" })).toBeVisible();
	});

	it("stays hidden when the browser does not ask for the target language", () => {
		setBrowserLanguages(["fr-FR", "en-US"]);
		renderBanner();

		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	it("stays hidden once the visitor has chosen a language", () => {
		setPreferredLocale("fr");
		renderBanner();

		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	it("stays hidden once the visitor has closed it", () => {
		setLanguageSuggestionDismissed();
		renderBanner();

		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	it("closing it hides it and remembers the choice", () => {
		renderBanner();

		fireEvent.click(screen.getByRole("button", { name: "Close" }));

		expect(screen.queryByRole("link")).not.toBeInTheDocument();
		expect(getLanguageSuggestionDismissed()).toBe(true);
	});

	it("following the link remembers the target language for the app", () => {
		renderBanner();

		fireEvent.click(screen.getByRole("link", { name: "View in English" }));

		expect(getPreferredLocale()).toBe("en");
	});
});
