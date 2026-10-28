/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { SimpleTreeView } from "@mui/x-tree-view";
import { i18nWrapper } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "../projects/ProjectContext";
import ExplorerConfigurationItems from "./ExplorerConfigurationItems";
import {
	HARDWARE_CONFIGURATION_PAGE_DATA,
	SCENE3D_CONFIGURATION_PAGE_DATA,
} from "@/ui/stores/project/pages-data";

jest.mock("../projects/ProjectContext");
jest.mock("../pages/HardwareConfigurationPage", () => ({
	HARDWARE_CONFIGURATION_PAGE_DATA: { id: "hardware-configuration" },
}));
jest.mock("../pages/Scene3dConfigurationPage", () => ({
	SCENE3D_CONFIGURATION_PAGE_DATA: { id: "scene3d-configuration" },
}));

function setup() {
	const pagesManager = { openPage: jest.fn() };
	(useProjectStore as jest.Mock).mockImplementation(
		selectorImplementation({ pagesManager }),
	);
	render(
		<SimpleTreeView>
			<ExplorerConfigurationItems styles={{}} />
		</SimpleTreeView>,
		{ wrapper: i18nWrapper() },
	);
	return pagesManager;
}

describe("ExplorerConfigurationItems", () => {
	afterEach(() => jest.clearAllMocks());

	it("opens the hardware configuration page", () => {
		const pagesManager = setup();
		fireEvent.click(screen.getByText("Configuration matérielle"));
		expect(pagesManager.openPage).toHaveBeenCalledWith(
			HARDWARE_CONFIGURATION_PAGE_DATA,
		);
	});

	it("opens the 3D scene configuration page", () => {
		const pagesManager = setup();
		fireEvent.click(screen.getByText("Configuration scène 3D"));
		expect(pagesManager.openPage).toHaveBeenCalledWith(
			SCENE3D_CONFIGURATION_PAGE_DATA,
		);
	});
});
