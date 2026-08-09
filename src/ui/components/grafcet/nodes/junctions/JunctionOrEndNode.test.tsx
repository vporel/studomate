/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import JunctionOrEndBuilder from "@/schemas/grafcet/builders/junction-or-end.builder";
import { useGrafcetContext, useGrafcetStore } from "@/ui/components/grafcet/context/GrafcetContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import JunctionOrEndNode, { JunctionOrEndNodeType } from "./JunctionOrEndNode";

jest.mock("@/ui/components/grafcet/context/GrafcetContext");
jest.mock("@/ui/lib/react-flow/HandleWithConnectionsLimit", () => ({
	__esModule: true,
	default: () => null,
}));

describe("JunctionOrEndNode", () => {
	it("se rend sans planter", () => {
		const junction = new JunctionOrEndBuilder().id("junction-1").position(0, 0).build();
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
			type: "junction-or-end",
			position: { x: 0, y: 0 },
			dragging: false,
			zIndex: 0,
			isConnectable: true,
		} as unknown as JunctionOrEndNodeType & { id: string };

		const { container } = render(
			<ReactFlowProvider>
				<JunctionOrEndNode {...(props as any)} />
			</ReactFlowProvider>,
		);

		expect(container.querySelector(".junction-or-end-node")).toBeInTheDocument();
	});
});
