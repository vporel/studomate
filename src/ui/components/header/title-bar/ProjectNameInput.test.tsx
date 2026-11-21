/**
 * @jest-environment jsdom
 */
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import { fireEvent, render, screen } from "@testing-library/react";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import ProjectNameInput from "./ProjectNameInput";

jest.mock("@/ui/components/projects/ProjectContext");

function setup(
	mode: ProjectMode,
	{ editingEnabled = true, activePageLocked = false } = {},
) {
	const setProjectName = jest.fn();
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			mode,
			editingEnabled,
			activePageId: "g1",
			pagesData: {
				g1: { id: "g1", type: "grafcet", locked: activePageLocked },
			},
			project: { name: "Mon projet" },
			setProjectName,
		}),
	);
	render(<ProjectNameInput />);
	return { setProjectName, input: screen.getByRole("textbox") };
}

describe("ProjectNameInput", () => {
	it("is editable in Design mode and saves on blur", () => {
		const { input, setProjectName } = setup(ProjectMode.DESIGN);

		expect(input).toBeEnabled();
		fireEvent.change(input, { target: { value: "Nouveau" } });
		fireEvent.blur(input);

		expect(setProjectName).toHaveBeenCalledWith("Nouveau");
	});

	it("is disabled in Simulation mode", () => {
		const { input } = setup(ProjectMode.SIMULATION);

		expect(input).toBeDisabled();
	});

	it("is disabled for a project opened read-only", () => {
		const { input } = setup(ProjectMode.DESIGN, { editingEnabled: false });

		expect(input).toBeDisabled();
	});

	it("stays editable when the active page is locked: the name belongs to the project", () => {
		const { input } = setup(ProjectMode.DESIGN, { activePageLocked: true });

		expect(input).toBeEnabled();
	});
});
