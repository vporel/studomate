/** @jest-environment jsdom */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { PROJECT_STARTUP_PAGE_DATA } from "@/ui/stores/project/pages-data";
import HomeTool from "./HomeTool";

jest.mock("@/ui/components/projects/ProjectContext");

describe("HomeTool", () => {
	it("opens the startup page on click", () => {
		const openPage = jest.fn();
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({ pagesManager: { openPage } }),
		);
		renderWithI18n(<HomeTool />);

		fireEvent.click(screen.getByRole("button", { name: "Accueil" }));

		expect(openPage).toHaveBeenCalledWith(PROJECT_STARTUP_PAGE_DATA);
	});
});
