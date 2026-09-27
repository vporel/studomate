/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { i18nWrapper } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Project from "@/schemas/project/project.schema";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useProjectStore } from "../projects/ProjectContext";
import ExplorerProgramsItems from "./ExplorerProgramsItems";

jest.mock("../projects/ProjectContext");

function setup(project: Project) {
	(useProjectStore as jest.Mock).mockImplementation(
		selectorImplementation({
			project,
			mode: ProjectMode.DESIGN,
			grafcetsManager: {},
			laddersManager: {},
			pagesManager: {},
		}),
	);
	return render(
		<SimpleTreeView>
			<ExplorerProgramsItems styles={{}} onContextMenu={jest.fn()} />
		</SimpleTreeView>,
		{ wrapper: i18nWrapper() },
	);
}

describe("ExplorerProgramsItems", () => {
	it("shows a badge only on programs excluded from execution", () => {
		const project = new Project("p1", "P", "");
		const excluded = new Grafcet("g1", "Illustratif");
		excluded.excludedFromExecution = true;
		project.addProgram(excluded);
		project.addProgram(new Grafcet("g2", "Exécuté"));

		setup(project);

		expect(screen.getAllByText("Non exécuté")).toHaveLength(1);
		expect(
			screen.getByText("Illustratif").closest("li")!.textContent,
		).toContain("Non exécuté");
	});

	it("shows no badge when every program is executed", () => {
		const project = new Project("p1", "P", "");
		project.addProgram(new Grafcet("g1", "G1"));

		setup(project);

		expect(screen.queryByText("Non exécuté")).not.toBeInTheDocument();
	});
});
