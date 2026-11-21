/** @jest-environment jsdom */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import UndoTool from "./UndoTool";

jest.mock("@/ui/components/projects/ProjectContext");

describe("UndoTool", () => {
	const undoActiveScope = jest.fn();

	function setup({
		hasCommands,
		mode = ProjectMode.DESIGN,
		editingEnabled = true,
	}: {
		hasCommands: boolean;
		mode?: ProjectMode;
		editingEnabled?: boolean;
	}) {
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				mode,
				editingEnabled,
				activeScopeType: "project",
				hasCommandsToUndo: hasCommands,
				undoActiveScope,
			}),
		);
		renderWithI18n(<UndoTool />);
		return screen.getByRole("button", { name: "Annuler" });
	}

	afterEach(() => jest.clearAllMocks());

	it("calls undoActiveScope on click when there is something to undo", () => {
		const button = setup({ hasCommands: true });
		expect(button).toHaveAttribute("aria-disabled", "false");
		fireEvent.click(button);
		expect(undoActiveScope).toHaveBeenCalledTimes(1);
	});

	it("is disabled when there is nothing to undo", () => {
		const button = setup({ hasCommands: false });
		expect(button).toHaveAttribute("aria-disabled", "true");
		fireEvent.click(button);
		expect(undoActiveScope).not.toHaveBeenCalled();
	});

	it("is disabled outside design mode", () => {
		const button = setup({ hasCommands: true, mode: ProjectMode.SIMULATION });
		expect(button).toHaveAttribute("aria-disabled", "true");
	});

	it("is disabled when the project is read-only", () => {
		const button = setup({ hasCommands: true, editingEnabled: false });
		expect(button).toHaveAttribute("aria-disabled", "true");
	});
});
