/** @jest-environment jsdom */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import CloudConflictDialog from "./CloudConflictDialog";
import { useProjectStore } from "./ProjectContext";

jest.mock("./ProjectContext");

const resolveCloudConflict = jest.fn();

function setup(visible: boolean) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			ui: { cloudConflictModalVisible: visible },
			lifecycleManager: { resolveCloudConflict },
		}),
	);
	return renderWithI18n(<CloudConflictDialog />);
}

describe("CloudConflictDialog", () => {
	beforeEach(() => resolveCloudConflict.mockClear());

	it("renders nothing when there is no conflict", () => {
		const { container } = setup(false);

		expect(container).toBeEmptyDOMElement();
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("shows the conflict dialog when visible", () => {
		setup(true);

		expect(screen.getByRole("dialog")).toBeVisible();
		expect(screen.getByText("Projet modifié ailleurs")).toBeVisible();
	});

	it("reloads the online version", () => {
		setup(true);

		fireEvent.click(
			screen.getByRole("button", { name: "Reprendre la version en ligne" }),
		);

		expect(resolveCloudConflict).toHaveBeenCalledTimes(1);
		expect(resolveCloudConflict).toHaveBeenCalledWith("reload");
	});

	it("saves the local work as a copy", () => {
		setup(true);

		fireEvent.click(
			screen.getByRole("button", { name: "Enregistrer sous..." }),
		);

		expect(resolveCloudConflict).toHaveBeenCalledTimes(1);
		expect(resolveCloudConflict).toHaveBeenCalledWith("copy");
	});
});
