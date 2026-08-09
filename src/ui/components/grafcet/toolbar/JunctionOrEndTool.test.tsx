/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { GrafcetToolbarDnDProvider } from "./GrafcetToolbarDnDContext";
import JunctionOrEndTool from "./JunctionOrEndTool";

jest.mock("@/ui/components/projects/ProjectContext");

describe("JunctionOrEndTool", () => {
	it("porte la classe de l'element 'junction-or-end' et respecte disabled", () => {
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({ mode: ProjectMode.DESIGN }),
		);

		render(
			<GrafcetToolbarDnDProvider>
				<JunctionOrEndTool disabled />
			</GrafcetToolbarDnDProvider>,
		);

		expect(document.querySelector(".grafcet-toolbar__junction-or-end")).toBeInTheDocument();
		expect(document.querySelector(".grafcet-toolbar__tool--disabled")).toBeInTheDocument();
	});
});
