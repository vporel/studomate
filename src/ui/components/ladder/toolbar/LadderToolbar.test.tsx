/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useLadderStore } from "../context/LadderContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import SectionAddCommand from "@/schemas/ladder/commands/section-add.command";
import LadderToolbar from "./LadderToolbar";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("../context/LadderContext");

function setup({ mode = ProjectMode.DESIGN, executeOperation = jest.fn(), zoom = 1 } = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(selectorImplementation({ mode }));
	(useLadderStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			commandsStackManager: { executeOperation },
			viewManager: { zoomIn: jest.fn(), zoomOut: jest.fn() },
			zoom,
		}),
	);

	render(<LadderToolbar />);
	return { executeOperation };
}

describe("LadderToolbar", () => {
	it("assemble les outils de dépose et les contrôles de zoom sans planter", () => {
		setup();

		expect(document.querySelector(".app-toolbar__zoom-in")).toBeInTheDocument();
		expect(document.querySelector(".app-toolbar__zoom-out")).toBeInTheDocument();
		expect(screen.getByText("Section")).toBeInTheDocument();
	});

	it("dispatche SectionAddCommand au clic sur 'Section'", () => {
		const { executeOperation } = setup();

		fireEvent.click(screen.getByText("Section"));

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		expect(commands[0]).toBeInstanceOf(SectionAddCommand);
	});

	it("désactive le bouton 'Section' hors du mode DESIGN", () => {
		setup({ mode: ProjectMode.SIMULATION });
		expect(screen.getByText("Section").closest("button")).toBeDisabled();
	});
});
