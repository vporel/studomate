/** @jest-environment jsdom */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import RedoTool from "./RedoTool";

jest.mock("@/ui/components/projects/ProjectContext");

describe("RedoTool", () => {
	const redoActiveScope = jest.fn();

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
				hasCommandsToRedo: hasCommands,
				redoActiveScope,
			}),
		);
		renderWithI18n(<RedoTool />);
		return screen.getByRole("button", { name: "Rétablir" });
	}

	afterEach(() => jest.clearAllMocks());

	it("calls redoActiveScope on click when there is something to redo", () => {
		const button = setup({ hasCommands: true });
		expect(button).toHaveAttribute("aria-disabled", "false");
		fireEvent.click(button);
		expect(redoActiveScope).toHaveBeenCalledTimes(1);
	});

	it("is disabled when there is nothing to redo", () => {
		const button = setup({ hasCommands: false });
		expect(button).toHaveAttribute("aria-disabled", "true");
		fireEvent.click(button);
		expect(redoActiveScope).not.toHaveBeenCalled();
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
