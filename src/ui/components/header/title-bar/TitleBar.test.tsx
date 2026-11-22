/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import TitleBar from "./TitleBar";

jest.mock("@/ui/components/app-toolbar/AppToolbar", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("@/ui/components/language-switch/AppLanguageSwitch", () => ({
	__esModule: true,
	default: () => <span data-testid="language-switch" />,
}));
jest.mock("@/ui/components/auth/AccountStatus", () => ({
	__esModule: true,
	default: () => <span data-testid="account-status" />,
}));
jest.mock("./ProjectNameInput", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("./UnsavedChangesIndicator", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("@/ui/components/projects/ShareProjectButton", () => ({
	__esModule: true,
	default: ({ source, color }: { source: string; color?: string }) => (
		<button data-testid="share-button" data-color={color}>
			{source}
		</button>
	),
}));

describe("TitleBar", () => {
	it("offers to share the project, reporting the title bar as the source", () => {
		render(<TitleBar />);

		expect(screen.getByTestId("share-button")).toHaveTextContent("title-bar");
	});

	it("puts the share button between the language switch and the account, next to the sign-in it leads to", () => {
		render(<TitleBar />);

		const order = (a: HTMLElement, b: HTMLElement) =>
			a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;
		const language = screen.getByTestId("language-switch");
		const share = screen.getByTestId("share-button");
		const account = screen.getByTestId("account-status");

		expect(order(language, share)).toBeTruthy();
		expect(order(share, account)).toBeTruthy();
	});

	it("keeps the share button in the color of the bar rather than the primary one", () => {
		render(<TitleBar />);

		expect(screen.getByTestId("share-button")).toHaveAttribute(
			"data-color",
			"inherit",
		);
	});
});
