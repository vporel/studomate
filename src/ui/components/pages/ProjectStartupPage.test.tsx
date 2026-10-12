/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "../projects/ProjectContext";
import ProjectStartupPage from "./ProjectStartupPage";

jest.mock("../projects/ProjectContext");
jest.mock("../projects/useProjectPrograms", () => ({
	__esModule: true,
	default: () => [],
}));
jest.mock("./usePageTitle", () => ({
	usePageTitle: () => (page: { title: string }) => page.title,
}));

function setup() {
	const openPage = jest.fn();
	const newGrafcet = jest.fn();
	const newLadder = jest.fn();
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			activePageId: "project-startup",
			pagesManager: { openPage },
			grafcetsManager: { newGrafcet },
			laddersManager: { newLadder },
		}),
	);
	renderWithI18n(<ProjectStartupPage />);
	return { newGrafcet, newLadder, openPage };
}

describe("ProjectStartupPage : actions", () => {
	it("propose de créer un grafcet et un ladder", () => {
		setup();

		expect(
			screen.getByRole("menuitem", { name: "Nouveau grafcet" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("menuitem", { name: "Nouveau ladder" }),
		).toBeInTheDocument();
	});

	it("crée un grafcet au clic sur son action seulement", () => {
		const { newGrafcet, newLadder } = setup();

		fireEvent.click(screen.getByRole("menuitem", { name: "Nouveau grafcet" }));

		expect(newGrafcet).toHaveBeenCalledTimes(1);
		expect(newLadder).not.toHaveBeenCalled();
	});

	it("crée un ladder au clic sur son action seulement", () => {
		const { newGrafcet, newLadder } = setup();

		fireEvent.click(screen.getByRole("menuitem", { name: "Nouveau ladder" }));

		expect(newLadder).toHaveBeenCalledTimes(1);
		expect(newGrafcet).not.toHaveBeenCalled();
	});
});

describe("ProjectStartupPage : configuration matérielle", () => {
	it("ouvre la page de configuration matérielle au clic", () => {
		const { openPage, newGrafcet, newLadder } = setup();

		fireEvent.click(
			screen.getByRole("menuitem", { name: "Configuration matérielle" }),
		);

		expect(openPage).toHaveBeenCalledWith({
			id: "hardware-configuration",
			type: "hardware-configuration",
			title: "Configuration matérielle",
		});
		expect(newGrafcet).not.toHaveBeenCalled();
		expect(newLadder).not.toHaveBeenCalled();
	});
});
