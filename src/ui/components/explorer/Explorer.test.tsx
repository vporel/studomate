/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "../projects/ProjectContext";
import Explorer from "./Explorer";

jest.mock("../projects/ProjectContext");
jest.mock("./ExplorerVariablesItems", () => () => null);
jest.mock("./ExplorerProgramsItems", () => () => null);
jest.mock("./ExplorerHmiItems", () => () => null);
jest.mock("./ExplorerSystemBlockInstancesItems", () => () => null);
jest.mock("./ExplorerSystemBlocksItems", () => () => null);
jest.mock("./context-menu/ExplorerContextMenu", () => () => null);

function setup(activeScopeType: string) {
	const project = {
		getAllTimerBlockElements: () => [],
		getAllCounterBlockElements: () => [],
	};
	(useProjectStore as jest.Mock).mockImplementation(
		selectorImplementation({ project, activeScopeType }),
	);
	return render(<Explorer />, { wrapper: i18nWrapper() });
}

describe("Explorer", () => {
	afterEach(() => jest.clearAllMocks());

	it("affiche la palette « Blocs systèmes » sur un ladder", () => {
		setup("ladder");
		expect(screen.getByText("Blocs systèmes")).toBeInTheDocument();
	});

	it("masque la palette « Blocs systèmes » hors ladder", () => {
		setup("grafcet");
		expect(screen.queryByText("Blocs systèmes")).not.toBeInTheDocument();
	});
});
