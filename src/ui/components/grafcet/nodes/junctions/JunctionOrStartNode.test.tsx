/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import JunctionOrStartBuilder from "@/schemas/grafcet/builders/junction-or-start.builder";
import {
	useGrafcetContext,
	useGrafcetStore,
} from "@/ui/components/grafcet/context/GrafcetContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import JunctionOrStartNode, {
	JunctionOrStartNodeType,
} from "./JunctionOrStartNode";

jest.mock("@/ui/components/grafcet/context/GrafcetContext");
jest.mock("@/ui/lib/react-flow/HandleWithConnectionsLimit", () => ({
	__esModule: true,
	default: () => null,
}));

describe("JunctionOrStartNode", () => {
	it("se rend sans planter", () => {
		const junction = new JunctionOrStartBuilder()
			.id("junction-1")
			.position(0, 0)
			.build();
		(useGrafcetContext as jest.Mock).mockReturnValue({
			contextMenuEvents: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
		});
		(useGrafcetStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({ workflowManager: {}, highlightedNodesIds: [] }),
		);

		const props = {
			id: "junction-1",
			data: junction.data,
			selected: false,
			width: 0,
			type: "junction-or-start",
			position: { x: 0, y: 0 },
			dragging: false,
			zIndex: 0,
			isConnectable: true,
		} as unknown as JunctionOrStartNodeType & { id: string };

		const { container } = render(
			<ReactFlowProvider>
				<JunctionOrStartNode {...(props as any)} />
			</ReactFlowProvider>,
		);

		expect(
			container.querySelector(".junction-or-start-node"),
		).toBeInTheDocument();
	});
});
