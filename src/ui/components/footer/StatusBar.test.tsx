/**
 * @jest-environment jsdom
 */
import { screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import useOnlineStatus from "@/ui/lib/hooks/useOnlineStatus";
import StatusBar from "./StatusBar";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/lib/hooks/useOnlineStatus");
jest.mock("./RightActions", () => ({ __esModule: true, default: () => null }));

describe("StatusBar", () => {
	beforeEach(() => {
		(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({ project: { author: "Camille" } }),
		);
	});

	it("shows the author of the project", () => {
		(useOnlineStatus as jest.Mock).mockReturnValue(true);
		renderWithI18n(<StatusBar />);

		expect(screen.getByText("Auteur : Camille")).toBeTruthy();
	});

	it("shows no offline notice while online", () => {
		(useOnlineStatus as jest.Mock).mockReturnValue(true);
		renderWithI18n(<StatusBar />);

		expect(screen.queryByRole("status")).toBeNull();
	});

	it("shows an offline notice when the network is gone", () => {
		(useOnlineStatus as jest.Mock).mockReturnValue(false);
		renderWithI18n(<StatusBar />);

		expect(screen.getByRole("status").textContent).toBe("Hors ligne");
	});
});
