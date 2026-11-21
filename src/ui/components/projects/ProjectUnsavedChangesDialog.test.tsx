/** @jest-environment jsdom */
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "./ProjectContext";
import ProjectUnsavedChangesDialog from "./ProjectUnsavedChangesDialog";

jest.mock("./ProjectContext");

const setUnsavedChangesDialogVisible = jest.fn();
const saveProject = jest.fn();
const onContinue = jest.fn();
const onCancel = jest.fn();

function setup({
	visible = true,
	message = "",
	withCallbacks = true,
	buttonsProps,
}: {
	visible?: boolean;
	message?: string;
	withCallbacks?: boolean;
	buttonsProps?: Parameters<
		typeof ProjectUnsavedChangesDialog
	>[0]["buttonsProps"];
} = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			ui: {
				unsavedChangesDialogVisible: visible,
				unsavedChangesDialogMessage: message,
				onUnsavedChangesDialogContinue: withCallbacks ? onContinue : undefined,
				onUnsavedChangesDialogCancel: withCallbacks ? onCancel : undefined,
			},
			setUnsavedChangesDialogVisible,
			lifecycleManager: { saveProject },
		}),
	);
	return renderWithI18n(
		<ProjectUnsavedChangesDialog buttonsProps={buttonsProps} />,
	);
}

describe("ProjectUnsavedChangesDialog", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		saveProject.mockResolvedValue(true);
	});

	it("renders nothing while hidden", () => {
		setup({ visible: false });

		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("shows the default message when none is set", () => {
		setup();

		expect(
			screen.getByText(
				"Voulez-vous enregistrer les modifications avant de quitter le projet ?",
			),
		).toBeVisible();
	});

	it("shows the custom message when one is set", () => {
		setup({ message: "Message perso" });

		expect(screen.getByText("Message perso")).toBeVisible();
	});

	it("uses the button labels it is given", () => {
		setup({
			buttonsProps: {
				save: { text: "Sauver" },
				continueWithoutSaving: { text: "Ignorer" },
				cancel: { text: "Rester" },
			},
		});

		expect(screen.getByRole("button", { name: "Sauver" })).toBeVisible();
		expect(screen.getByRole("button", { name: "Ignorer" })).toBeVisible();
		expect(screen.getByRole("button", { name: "Rester" })).toBeVisible();
	});

	it("continues without saving", () => {
		setup();

		fireEvent.click(
			screen.getByRole("button", { name: "Continuer sans enregistrer" }),
		);

		expect(setUnsavedChangesDialogVisible).toHaveBeenCalledWith(false);
		expect(onContinue).toHaveBeenCalledTimes(1);
		expect(saveProject).not.toHaveBeenCalled();
	});

	it("continues after a successful save", async () => {
		setup();

		fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

		await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1));
		expect(setUnsavedChangesDialogVisible).toHaveBeenCalledWith(false);
		expect(saveProject).toHaveBeenCalledTimes(1);
	});

	it("does not continue when the save fails", async () => {
		saveProject.mockResolvedValue(false);
		setup();

		fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

		await waitFor(() => expect(saveProject).toHaveBeenCalled());
		expect(onContinue).not.toHaveBeenCalled();
	});

	it("cancels with the Cancel button", () => {
		setup();

		fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

		expect(setUnsavedChangesDialogVisible).toHaveBeenCalledWith(false);
		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onContinue).not.toHaveBeenCalled();
	});

	it("cancels with the close icon", () => {
		setup();

		fireEvent.click(screen.getByRole("button", { name: "close" }));

		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it("closes without error when no callback is registered", async () => {
		setup({ withCallbacks: false });

		fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
		fireEvent.click(
			screen.getByRole("button", { name: "Continuer sans enregistrer" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

		await waitFor(() => expect(saveProject).toHaveBeenCalled());
		expect(setUnsavedChangesDialogVisible).toHaveBeenCalledTimes(3);
	});
});
