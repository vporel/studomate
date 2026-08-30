/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import UnsavedChangesIndicator from "./UnsavedChangesIndicator";

jest.mock("@/ui/components/projects/ProjectContext");

describe("UnsavedChangesIndicator", () => {
	const saveProject = jest.fn();

	function setup(hasUnsavedChanges: boolean, savingProject: boolean) {
		(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({
				hasUnsavedChanges,
				savingProject,
				lifecycleManager: { saveProject },
			}),
		);
		return render(<UnsavedChangesIndicator />);
	}

	afterEach(() => jest.clearAllMocks());

	it("renders nothing when there are no unsaved changes", () => {
		setup(false, false);
		expect(screen.queryByText("Cliquez ici pour enregistrer")).toBeNull();
	});

	it("shows the prompt when there are unsaved changes", () => {
		setup(true, false);
		expect(
			screen.getByText("Cliquez ici pour enregistrer"),
		).toBeInTheDocument();
	});

	it("triggers saveProject when clicked", () => {
		setup(true, false);
		fireEvent.click(screen.getByText("Cliquez ici pour enregistrer"));
		expect(saveProject).toHaveBeenCalledTimes(1);
	});

	it("does not trigger saveProject when already saving", () => {
		setup(true, true);
		fireEvent.click(screen.getByText("Cliquez ici pour enregistrer"));
		expect(saveProject).not.toHaveBeenCalled();
	});

	it("shows a progress indicator while saving", () => {
		setup(true, true);
		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});
});
