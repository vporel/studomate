/**
 * @jest-environment jsdom
 */
import { act, render, screen } from "@testing-library/react";
import {
	FixedLocaleProvider,
	LocaleProvider,
	useLocaleContext,
} from "./LocaleProvider";

const mockGetPreferredLocale = jest.fn();
const mockSetPreferredLocale = jest.fn();
jest.mock("@/persistence/preferences.storage", () => ({
	getPreferredLocale: () => mockGetPreferredLocale(),
	setPreferredLocale: (...args: unknown[]) => mockSetPreferredLocale(...args),
}));

function Probe() {
	const { locale, setLocale } = useLocaleContext();
	return (
		<div>
			<span data-testid="locale">{locale}</span>
			<button onClick={() => setLocale("en")}>en</button>
		</div>
	);
}

describe("LocaleProvider", () => {
	beforeEach(() => {
		// Langue de navigateur non supportée : la détection retombe sur le défaut (fr).
		Object.defineProperty(navigator, "language", {
			value: "de-DE",
			configurable: true,
		});
		Object.defineProperty(navigator, "languages", {
			value: ["de-DE"],
			configurable: true,
		});
	});
	afterEach(() => jest.clearAllMocks());

	it("applique la préférence enregistrée après le montage", () => {
		mockGetPreferredLocale.mockReturnValue("en");

		render(
			<LocaleProvider>
				<Probe />
			</LocaleProvider>,
		);

		expect(screen.getByTestId("locale")).toHaveTextContent("en");
		expect(document.documentElement.lang).toBe("en");
	});

	it("retombe sur le français quand aucune préférence n'est enregistrée", () => {
		mockGetPreferredLocale.mockReturnValue(null);

		render(
			<LocaleProvider>
				<Probe />
			</LocaleProvider>,
		);

		expect(screen.getByTestId("locale")).toHaveTextContent("fr");
	});

	it("persiste le changement de langue", () => {
		mockGetPreferredLocale.mockReturnValue(null);

		render(
			<LocaleProvider>
				<Probe />
			</LocaleProvider>,
		);

		act(() => {
			screen.getByRole("button", { name: "en" }).click();
		});

		expect(mockSetPreferredLocale).toHaveBeenCalledWith("en");
		expect(screen.getByTestId("locale")).toHaveTextContent("en");
	});
});

describe("FixedLocaleProvider", () => {
	afterEach(() => jest.clearAllMocks());

	it("expose la langue imposée, sans consulter les préférences", () => {
		mockGetPreferredLocale.mockReturnValue("fr");

		render(
			<FixedLocaleProvider locale="en">
				<Probe />
			</FixedLocaleProvider>,
		);

		expect(screen.getByTestId("locale")).toHaveTextContent("en");
		expect(mockGetPreferredLocale).not.toHaveBeenCalled();
	});

	it("ignore une demande de changement de langue", () => {
		render(
			<FixedLocaleProvider locale="en">
				<Probe />
			</FixedLocaleProvider>,
		);

		act(() => screen.getByRole("button").click());

		expect(screen.getByTestId("locale")).toHaveTextContent("en");
		expect(mockSetPreferredLocale).not.toHaveBeenCalled();
	});
});
