/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import RailTerminalNode, { RailTerminalNodeType } from "./RailTerminalNode";

function setup(virtual: boolean) {
	const props = {
		id: "rail-1",
		data: { virtual },
		selected: false,
		type: "railTerminal",
		position: { x: 0, y: 0 },
		dragging: false,
		zIndex: 0,
		isConnectable: true,
	} as unknown as RailTerminalNodeType & { id: string };

	return render(
		<ReactFlowProvider>
			<RailTerminalNode {...(props as any)} />
		</ReactFlowProvider>,
	);
}

describe("RailTerminalNode", () => {
	it("distingue visuellement (classe CSS différente) une borne virtuelle d'une borne réelle", () => {
		const virtualBar = setup(true).container.querySelectorAll("div")[1] as HTMLElement;
		const realBar = setup(false).container.querySelectorAll("div")[1] as HTMLElement;

		expect(virtualBar.className).not.toBe(realBar.className);
	});

	it("expose un handle source à droite pour la connexion au premier élément de la ligne", () => {
		const { container } = setup(false);
		const handle = container.querySelector('[data-handleid="source"]');
		expect(handle).toHaveClass("source");
	});
});
