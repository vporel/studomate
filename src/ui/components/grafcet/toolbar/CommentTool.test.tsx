/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { GrafcetToolbarDnDProvider } from "./GrafcetToolbarDnDContext";
import CommentTool from "./CommentTool";

jest.mock("@/ui/components/projects/ProjectContext");

describe("CommentTool", () => {
	it("porte la classe de l'element 'comment' et respecte disabled", () => {
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({ mode: ProjectMode.DESIGN }),
		);

		render(
			<GrafcetToolbarDnDProvider>
				<CommentTool disabled />
			</GrafcetToolbarDnDProvider>,
		);

		expect(
			document.querySelector(".grafcet-toolbar__comment"),
		).toBeInTheDocument();
		expect(
			document.querySelector(".grafcet-toolbar__tool--disabled"),
		).toBeInTheDocument();
	});
});
