/**
 * @jest-environment jsdom
 */
import { renderWithI18n as render } from "@tests/utils/i18n";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { GrafcetToolbarDnDProvider } from "./GrafcetToolbarDnDContext";
import JunctionAndStartTool from "./JunctionAndStartTool";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/components/grafcet/context/GrafcetContext");

describe("JunctionAndStartTool", () => {
	it("porte la classe de l'element 'junction-and-start' et respecte disabled", () => {
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({ mode: ProjectMode.DESIGN }),
		);

		render(
			<GrafcetToolbarDnDProvider>
				<JunctionAndStartTool disabled />
			</GrafcetToolbarDnDProvider>,
		);

		expect(
			document.querySelector(".grafcet-toolbar__junction-and-start"),
		).toBeInTheDocument();
		expect(
			document.querySelector(".grafcet-toolbar__tool--disabled"),
		).toBeInTheDocument();
	});
});
