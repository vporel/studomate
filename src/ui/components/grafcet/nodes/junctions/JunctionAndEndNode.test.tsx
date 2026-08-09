/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import JunctionAndEndBuilder from "@/schemas/grafcet/builders/junction-and-end.builder";
import { useGrafcetContext, useGrafcetStore } from "@/ui/components/grafcet/context/GrafcetContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import JunctionAndEndNode, { JunctionAndEndNodeType } from "./JunctionAndEndNode";

jest.mock("@/ui/components/grafcet/context/GrafcetContext");
jest.mock("@/ui/lib/react-flow/HandleWithConnectionsLimit", () => ({
	__esModule: true,
	default: () => null,
}));

describe("JunctionAndEndNode", () => {
	it("se rend sans planter", () => {
		const junction = new JunctionAndEndBuilder().id("junction-1").position(0, 0).build();
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
			type: "junction-and-end",
			position: { x: 0, y: 0 },
			dragging: false,
			zIndex: 0,
			isConnectable: true,
		} as unknown as JunctionAndEndNodeType & { id: string };

		const { container } = render(
			<ReactFlowProvider>
				<JunctionAndEndNode {...(props as any)} />
			</ReactFlowProvider>,
		);

		expect(container.querySelector(".junction-and-end-node")).toBeInTheDocument();
	});
});
