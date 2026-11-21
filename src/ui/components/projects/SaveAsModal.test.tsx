/** @jest-environment jsdom */
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "./ProjectContext";
import SaveAsModal from "./SaveAsModal";

jest.mock("./ProjectContext");

const saveProjectAs = jest.fn();
const setSaveAsModalVisible = jest.fn();

function setup({ visible = true, projectName = "Mon projet" } = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			ui: { saveAsModalVisible: visible },
			setSaveAsModalVisible,
			lifecycleManager: { saveProjectAs },
			project: { name: projectName },
		}),
	);
	return renderWithI18n(<SaveAsModal />);
}

const nameInput = () => screen.getByLabelText("Nom du projet");
const saveButton = () => screen.getByRole("button", { name: "Enregistrer" });

describe("SaveAsModal", () => {
	beforeEach(() => {
		saveProjectAs.mockReset().mockResolvedValue(true);
		setSaveAsModalVisible.mockClear();
	});

	it("renders nothing while hidden", () => {
		setup({ visible: false });

		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("prefills the name with the current project name", () => {
		setup();

		expect(nameInput()).toHaveValue("Mon projet");
	});

	it("disables saving when the name is blank", () => {
		setup();

		fireEvent.change(nameInput(), { target: { value: "   " } });

		expect(saveButton()).toBeDisabled();
	});

	it("does not submit a blank name with Enter", () => {
		setup();
		fireEvent.change(nameInput(), { target: { value: "  " } });

		fireEvent.keyDown(nameInput(), { key: "Enter" });

		expect(saveProjectAs).not.toHaveBeenCalled();
	});

	it("saves under the trimmed name and closes on success", async () => {
		setup();
		fireEvent.change(nameInput(), { target: { value: "  Copie  " } });

		fireEvent.click(saveButton());

		await waitFor(() =>
			expect(setSaveAsModalVisible).toHaveBeenCalledWith(false),
		);
		expect(saveProjectAs).toHaveBeenCalledWith("Copie");
	});

	it("saves with Enter", async () => {
		setup();

		fireEvent.keyDown(nameInput(), { key: "Enter" });

		await waitFor(() =>
			expect(saveProjectAs).toHaveBeenCalledWith("Mon projet"),
		);
	});

	it("stays open when the save fails", async () => {
		saveProjectAs.mockResolvedValue(false);
		setup();

		fireEvent.click(saveButton());

		await waitFor(() => expect(saveProjectAs).toHaveBeenCalled());
		expect(setSaveAsModalVisible).not.toHaveBeenCalled();
	});

	it("closes without saving on cancel", () => {
		setup();

		fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

		expect(setSaveAsModalVisible).toHaveBeenCalledWith(false);
		expect(saveProjectAs).not.toHaveBeenCalled();
	});
});
