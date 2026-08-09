/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { GrafcetToolbarDnDProvider } from "./GrafcetToolbarDnDContext";
import ActionTool from "./ActionTool";

jest.mock("@/ui/components/projects/ProjectContext");

describe("ActionTool", () => {
	it("porte la classe de l'element 'action' et respecte disabled", () => {
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({ mode: ProjectMode.DESIGN }),
		);

		render(
			<GrafcetToolbarDnDProvider>
				<ActionTool disabled />
			</GrafcetToolbarDnDProvider>,
		);

		expect(document.querySelector(".grafcet-toolbar__action")).toBeInTheDocument();
		expect(document.querySelector(".grafcet-toolbar__tool--disabled")).toBeInTheDocument();
	});
});
