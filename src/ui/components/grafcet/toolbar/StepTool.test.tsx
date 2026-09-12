/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useGrafcetStore } from "../context/GrafcetContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { GrafcetToolbarDnDProvider } from "./GrafcetToolbarDnDContext";
import StepTool from "./StepTool";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("../context/GrafcetContext");

function setup({
	initial = false,
	nodes = [] as { type: string; data: any }[],
} = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ mode: ProjectMode.DESIGN }),
	);
	(useGrafcetStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ nodes }),
	);

	render(
		<GrafcetToolbarDnDProvider>
			<StepTool initial={initial} />
		</GrafcetToolbarDnDProvider>,
	);
}

describe("StepTool", () => {
	it("est activé pour une étape normale même si une étape initiale existe déjà", () => {
		setup({
			initial: false,
			nodes: [{ type: "step", data: { initial: true } }],
		});
		expect(
			document.querySelector(".grafcet-toolbar__tool--disabled"),
		).not.toBeInTheDocument();
	});

	it("est activé pour une étape initiale si aucune n'existe encore", () => {
		setup({
			initial: true,
			nodes: [{ type: "step", data: { initial: false } }],
		});
		expect(
			document.querySelector(".grafcet-toolbar__tool--disabled"),
		).not.toBeInTheDocument();
	});

	it("se désactive pour une étape initiale si une étape initiale existe déjà", () => {
		setup({
			initial: true,
			nodes: [{ type: "step", data: { initial: true } }],
		});
		expect(
			document.querySelector(".grafcet-toolbar__tool--disabled"),
		).toBeInTheDocument();
	});
});
