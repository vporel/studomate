/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { GrafcetToolbarDnDProvider } from "./GrafcetToolbarDnDContext";
import JunctionAndEndTool from "./JunctionAndEndTool";

jest.mock("@/ui/components/projects/ProjectContext");

describe("JunctionAndEndTool", () => {
	it("porte la classe de l'element 'junction-and-end' et respecte disabled", () => {
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({ mode: ProjectMode.DESIGN }),
		);

		render(
			<GrafcetToolbarDnDProvider>
				<JunctionAndEndTool disabled />
			</GrafcetToolbarDnDProvider>,
		);

		expect(
			document.querySelector(".grafcet-toolbar__junction-and-end"),
		).toBeInTheDocument();
		expect(
			document.querySelector(".grafcet-toolbar__tool--disabled"),
		).toBeInTheDocument();
	});
});
