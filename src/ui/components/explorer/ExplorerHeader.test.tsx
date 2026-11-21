/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import { useAppContext } from "../AppContext";
import ExplorerHeader from "./ExplorerHeader";

jest.mock("../AppContext");

describe("ExplorerHeader", () => {
	it("shows the title", () => {
		(useAppContext as jest.Mock).mockReturnValue({
			setViewAppearance: jest.fn(),
		});
		render(<ExplorerHeader />, { wrapper: i18nWrapper() });
		expect(screen.getByText("EXPLORATEUR")).toBeInTheDocument();
	});

	it("hides the explorer and keeps the rest of the appearance when closed", () => {
		const setViewAppearance = jest.fn();
		(useAppContext as jest.Mock).mockReturnValue({ setViewAppearance });
		render(<ExplorerHeader />, { wrapper: i18nWrapper() });

		fireEvent.click(
			screen.getByRole("button", { name: "Fermer l'explorateur" }),
		);

		const updater = setViewAppearance.mock.calls[0][0];
		expect(updater({ explorer: true, other: 1 })).toEqual({
			explorer: false,
			other: 1,
		});
	});
});
