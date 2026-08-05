/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from "@testing-library/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import SaveTool from "./SaveTool";

jest.mock("@/ui/components/projects/ProjectContext");

describe("SaveTool", () => {
	const saveProject = jest.fn();

	function setup(hasUnsavedChanges: boolean) {
		(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({ hasUnsavedChanges, saveProject }),
		);
		return render(<SaveTool />);
	}

	afterEach(() => jest.clearAllMocks());

	it("marks itself disabled when there are no unsaved changes", () => {
		const { container } = setup(false);
		expect(container.querySelector(".app-toolbar__tool--disabled")).not.toBeNull();
	});

	it("does not mark itself disabled when there are unsaved changes", () => {
		const { container } = setup(true);
		expect(container.querySelector(".app-toolbar__tool--disabled")).toBeNull();
	});

	it("triggers saveProject when clicked with unsaved changes", () => {
		const { container } = setup(true);
		fireEvent.click(container.querySelector(".app-toolbar__save")!);
		expect(saveProject).toHaveBeenCalledTimes(1);
	});

	it("does not trigger saveProject when clicked while disabled", () => {
		const { container } = setup(false);
		fireEvent.click(container.querySelector(".app-toolbar__save")!);
		expect(saveProject).not.toHaveBeenCalled();
	});
});
