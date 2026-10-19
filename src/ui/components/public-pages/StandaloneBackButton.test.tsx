/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { isStandaloneDisplay } from "@/ui/lib/platform";
import StandaloneBackButton from "./StandaloneBackButton";

jest.mock("@/ui/lib/platform");

let mockPathname = "/manuel-utilisateur";
jest.mock("next/navigation", () => ({
	...jest.requireActual("next/navigation"),
	usePathname: () => mockPathname,
}));

function setNavigation(value: { canGoBack: boolean } | undefined) {
	Object.defineProperty(window, "navigation", { value, configurable: true });
}

function setHistoryLength(length: number) {
	Object.defineProperty(window.history, "length", {
		value: length,
		configurable: true,
	});
}

/** `back` drives the Navigation API, which every test below goes through unless stated. */
function setup(standalone: boolean, back: boolean) {
	(isStandaloneDisplay as jest.Mock).mockReturnValue(standalone);
	setNavigation({ canGoBack: back });
	return renderWithI18n(<StandaloneBackButton />);
}

describe("StandaloneBackButton", () => {
	beforeEach(() => {
		mockPathname = "/manuel-utilisateur";
	});

	afterEach(() => setNavigation(undefined));

	it("shows a back button in an installed app that has history", () => {
		setup(true, true);

		expect(screen.getByRole("button", { name: "Retour" })).toBeInTheDocument();
	});

	it("is hidden in a regular browser tab", () => {
		setup(false, true);

		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("is hidden while there is nothing to go back to", () => {
		setup(true, false);

		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("goes back in the history on click", () => {
		const back = jest.spyOn(window.history, "back").mockImplementation(() => {});
		setup(true, true);

		fireEvent.click(screen.getByRole("button", { name: "Retour" }));

		expect(back).toHaveBeenCalledTimes(1);
		back.mockRestore();
	});

	it("falls back to the history length when the browser has no Navigation API", () => {
		(isStandaloneDisplay as jest.Mock).mockReturnValue(true);
		setNavigation(undefined);
		setHistoryLength(1);
		const { unmount } = renderWithI18n(<StandaloneBackButton />);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		unmount();

		setHistoryLength(2);
		renderWithI18n(<StandaloneBackButton />);
		expect(screen.getByRole("button", { name: "Retour" })).toBeInTheDocument();
	});

	it("appears once a navigation has created history", () => {
		const { rerender } = setup(true, false);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();

		setNavigation({ canGoBack: true });
		mockPathname = "/manuel-utilisateur/grafcet";
		rerender(<StandaloneBackButton />);

		expect(screen.getByRole("button", { name: "Retour" })).toBeInTheDocument();
	});
});
