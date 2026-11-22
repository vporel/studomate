/**
 * @jest-environment jsdom
 */
import { ElementType } from "@/schemas/grafcet/element.schema";
import { GRAFCET_ELEMENT_CLASSES } from "@/ui/utils/grafcet/grafcet-element-classes";
import setGrafcetDragPreview, {
	buildGrafcetDragPreview,
} from "./grafcet-drag-preview";
import { DraggedGrafcetElement } from "./GrafcetToolbarDnDContext";

const ALL_TOOLS: DraggedGrafcetElement[] = [
	{ type: "step", extraData: {} },
	{ type: "step", extraData: { initial: true } },
	{ type: "transition" },
	{ type: "action" },
	{ type: "comment" },
	{ type: "step-referral-source" },
	{ type: "step-referral-target" },
	{ type: "junction-and-start" },
	{ type: "junction-and-end" },
	{ type: "junction-or-start" },
	{ type: "junction-or-end" },
];

const describeTool = (tool: DraggedGrafcetElement) =>
	tool.type === "step" && tool.extraData.initial ? "initial step" : tool.type;

const COMMENT = "Comentario";

// The element is drawn with a 2px margin on each side.
const MARGIN = 2;

describe("buildGrafcetDragPreview", () => {
	it.each(ALL_TOOLS.map((tool) => [describeTool(tool), tool] as const))(
		"draws the %s in the space of its node, plus a margin",
		(_, tool) => {
			const { markup, width, height } = buildGrafcetDragPreview(
				tool,
				1,
				COMMENT,
			);
			const { width: nodeWidth, height: nodeHeight } =
				GRAFCET_ELEMENT_CLASSES[tool.type as ElementType].DEFAULT_DIMENSIONS;

			expect(width).toBe(nodeWidth + 2 * MARGIN);
			expect(height).toBe(nodeHeight + 2 * MARGIN);
			expect(markup).toContain(`viewBox="0 0 ${width} ${height}"`);
			expect(markup).toMatch(/<(rect|line|polyline)/);
		},
	);

	it("draws a different image for every tool", () => {
		const markups = ALL_TOOLS.map(
			(tool) => buildGrafcetDragPreview(tool, 1, COMMENT).markup,
		);

		expect(new Set(markups).size).toBe(ALL_TOOLS.length);
	});

	it("paints no background around the element", () => {
		const { markup } = buildGrafcetDragPreview(
			{ type: "transition" },
			1,
			COMMENT,
		);

		expect(markup).not.toContain("<rect");
	});

	it("scales the drawing with the zoom, keeping the node coordinates", () => {
		const base = buildGrafcetDragPreview({ type: "action" }, 1, COMMENT);
		const zoomed = buildGrafcetDragPreview({ type: "action" }, 2, COMMENT);

		expect(zoomed.width).toBe(base.width * 2);
		expect(zoomed.height).toBe(base.height * 2);
		expect(zoomed.markup).toContain(`width="${base.width * 2}"`);
		expect(zoomed.markup).toContain(
			`viewBox="0 0 ${base.width} ${base.height}"`,
		);
	});

	it("draws the element like the PDF export: double border for an initial step, dashes for a comment", () => {
		const rects = (tool: DraggedGrafcetElement) =>
			buildGrafcetDragPreview(tool, 1, COMMENT).markup.match(/<rect/g) ?? [];

		expect(rects({ type: "step", extraData: {} })).toHaveLength(1);
		expect(rects({ type: "step", extraData: { initial: true } })).toHaveLength(
			2,
		);
		expect(
			buildGrafcetDragPreview({ type: "comment" }, 1, COMMENT).markup,
		).toContain("stroke-dasharray");
	});

	it("writes the given text in a new comment", () => {
		expect(
			buildGrafcetDragPreview({ type: "comment" }, 1, COMMENT).markup,
		).toContain(COMMENT);
	});

	it("draws the junction with a double bar for AND and a single bar for OR", () => {
		const lines = (type: "junction-and-start" | "junction-or-start") =>
			buildGrafcetDragPreview({ type }, 1, COMMENT).markup.match(/<line/g) ??
			[];

		// bars + pivot + 2 branches
		expect(lines("junction-and-start")).toHaveLength(5);
		expect(lines("junction-or-start")).toHaveLength(4);
	});
});

describe("setGrafcetDragPreview", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	function capture(tool: DraggedGrafcetElement, zoom: number) {
		const setDragImage = jest.fn();
		setGrafcetDragPreview(
			{ setDragImage } as unknown as DataTransfer,
			tool,
			zoom,
			COMMENT,
		);
		const [element, offsetX, offsetY] = setDragImage.mock.calls[0];
		return { element: element as HTMLElement, offsetX, offsetY };
	}

	it("uses the drawing of the element, centered on the cursor", () => {
		const { element, offsetX, offsetY } = capture({ type: "transition" }, 2);

		// transition: 40 x 30, plus a 2px margin on each side
		expect(element.style.width).toBe("88px");
		expect(element.style.height).toBe("68px");
		expect(offsetX).toBe(44);
		expect(offsetY).toBe(34);
		expect(element.querySelector("svg")).not.toBeNull();
	});

	it("keeps the element in the document while the browser captures it, then removes it", () => {
		const setDragImage = jest.fn((element: HTMLElement) => {
			expect(document.body.contains(element)).toBe(true);
		});
		setGrafcetDragPreview(
			{ setDragImage } as unknown as DataTransfer,
			{ type: "action" },
			1,
			COMMENT,
		);
		const [element] = setDragImage.mock.calls[0];

		jest.runAllTimers();

		expect(document.body.contains(element)).toBe(false);
	});
});
