/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useGrafcetContext, useGrafcetStore } from "../context/GrafcetContext";
import { fakeStoreApi, selectorImplementation } from "@tests/utils/store-mocks";
import GrafcetFlow from "./GrafcetFlow";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("../context/GrafcetContext");
// Le menu contextuel a son propre scope de test ; ici on vérifie seulement que GrafcetFlow
// l'assemble sans planter.
jest.mock("../context-menu/GrafcetContextMenu", () => ({
	__esModule: true,
	default: () => <div data-testid="context-menu" />,
}));

// jsdom n'implémente pas ResizeObserver (API navigateur, hors du DOM qu'il simule) ; React Flow
// s'en sert pour mesurer le viewport au montage.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
(global as any).ResizeObserver = ResizeObserverStub;

describe("GrafcetFlow", () => {
	it("se rend sans planter et affiche la page identifiée par l'id du grafcet", () => {
		const grafcet = new GrafcetBuilder().id("g1").build();

		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				mode: ProjectMode.DESIGN,
				setActiveScope: jest.fn(),
			}),
		);
		(useGrafcetContext as jest.Mock).mockReturnValue({
			store: fakeStoreApi({ grafcet }),
		});
		(useGrafcetStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				grafcet,
				nodes: [],
				edges: [],
				viewport: null,
				viewManager: {
					setReactFlowInstance: jest.fn(),
					setViewport: jest.fn(),
					setContainerElement: jest.fn(),
				},
				workflowManager: {
					handleNodesChange: jest.fn(),
					handleNewConnection: jest.fn(),
					handleEdgesChange: jest.fn(),
					deleteNodesAndEdges: jest.fn(),
				},
			}),
		);

		const { container } = render(<GrafcetFlow />);

		expect(container.querySelector("#grafcet-g1")).toBeInTheDocument();
	});
});
