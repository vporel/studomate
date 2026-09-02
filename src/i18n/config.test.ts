import { DEFAULT_LOCALE, detectBrowserLocale, isLocale } from "./config";

describe("isLocale", () => {
	it("reconnaît les langues supportées", () => {
		expect(isLocale("fr")).toBe(true);
		expect(isLocale("en")).toBe(true);
	});

	it("rejette le reste", () => {
		expect(isLocale("de")).toBe(false);
		expect(isLocale("")).toBe(false);
		expect(isLocale(null)).toBe(false);
		expect(isLocale(undefined)).toBe(false);
	});
});

describe("detectBrowserLocale", () => {
	const original = Object.getOwnPropertyDescriptor(
		globalThis,
		"navigator",
	);

	function setNavigator(value: unknown) {
		Object.defineProperty(globalThis, "navigator", {
			value,
			configurable: true,
		});
	}

	afterEach(() => {
		if (original) Object.defineProperty(globalThis, "navigator", original);
	});

	it("retient la première langue supportée du navigateur", () => {
		setNavigator({ language: "de-DE", languages: ["de-DE", "en-GB", "fr"] });
		expect(detectBrowserLocale()).toBe("en");
	});

	it("normalise la région", () => {
		setNavigator({ language: "fr-CA", languages: ["fr-CA"] });
		expect(detectBrowserLocale()).toBe("fr");
	});

	it("retombe sur le défaut si aucune langue n'est supportée", () => {
		setNavigator({ language: "de-DE", languages: ["de-DE"] });
		expect(detectBrowserLocale()).toBe(DEFAULT_LOCALE);
	});
});
