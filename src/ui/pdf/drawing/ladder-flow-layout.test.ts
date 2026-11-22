import layoutLadderFlow, {
	LadderFlowParams,
	maxDescriptionLines,
	truncateDescriptionLines,
} from "./ladder-flow-layout";

const base: Omit<LadderFlowParams, "blocks"> = {
	pageWidth: 300,
	pageHeight: 200,
	margin: 10,
	firstPageTop: 20,
	gap: 8,
	minSceneWidth: 100,
};

const block = (sceneWidth: number, sceneHeight: number, headerHeight = 5) => ({
	headerHeight,
	sceneWidth,
	sceneHeight,
});

describe("layoutLadderFlow", () => {
	it("returns an empty layout without sections", () => {
		expect(layoutLadderFlow({ ...base, blocks: [] })).toEqual({
			scale: 1,
			placements: [],
			pageCount: 0,
		});
	});

	it("fits the widest section to the page width", () => {
		const { scale } = layoutLadderFlow({
			...base,
			blocks: [block(140, 20), block(280, 20)],
		});
		expect(scale).toBeCloseTo((300 - 20) / 280);
	});

	it("caps the scale through minSceneWidth when every section is narrow", () => {
		const { scale } = layoutLadderFlow({
			...base,
			blocks: [block(40, 10)],
		});
		expect(scale).toBeCloseTo((300 - 20) / 100);
	});

	it("lowers the scale so the tallest section fits on a page, below the first page's top", () => {
		const { scale } = layoutLadderFlow({
			...base,
			blocks: [block(280, 20), block(280, 1000)],
		});
		expect(scale).toBeCloseTo((200 - 10 - 20 - 5) / 1000);
	});

	it("keeps the tallest section inside the first page when it comes first", () => {
		const { scale, placements } = layoutLadderFlow({
			...base,
			blocks: [block(280, 1000), block(280, 20)],
		});
		expect(placements[0]).toMatchObject({ page: 0, y: 20 });
		expect(20 + 5 + 1000 * scale).toBeLessThanOrEqual(200 - 10 + 1e-9);
	});

	it("places the first section at firstPageTop without separator", () => {
		const { placements } = layoutLadderFlow({
			...base,
			blocks: [block(280, 20)],
		});
		expect(placements[0]).toEqual({ page: 0, y: 20, separatorY: null });
	});

	it("stacks sections on the same page with a separator in the gap", () => {
		const { placements, scale, pageCount } = layoutLadderFlow({
			...base,
			blocks: [block(280, 20), block(280, 20)],
		});
		const secondY = 20 + 5 + 20 * scale + 8;
		expect(placements[1].page).toBe(0);
		expect(placements[1].y).toBeCloseTo(secondY);
		expect(placements[1].separatorY).toBeCloseTo(secondY - 4);
		expect(pageCount).toBe(1);
	});

	it("starts a new page at the margin when a section no longer fits", () => {
		const { placements, pageCount } = layoutLadderFlow({
			...base,
			blocks: [block(280, 70), block(280, 70), block(280, 70)],
		});
		expect(placements.map((p) => p.page)).toEqual([0, 0, 1]);
		expect(placements[2]).toEqual({ page: 1, y: 10, separatorY: null });
		expect(pageCount).toBe(2);
	});

	it("keeps every section above the bottom margin", () => {
		const blocks = Array.from({ length: 12 }, () => block(280, 50));
		const { placements, scale } = layoutLadderFlow({ ...base, blocks });
		placements.forEach(({ y }, i) => {
			const end = y + blocks[i].headerHeight + blocks[i].sceneHeight * scale;
			expect(end).toBeLessThanOrEqual(200 - 10 + 0.01);
		});
	});
});

describe("layoutLadderFlow with a header taller than the page", () => {
	it("keeps a positive scale, the drawing keeping half of the page height below the first page's top", () => {
		const { scale } = layoutLadderFlow({
			...base,
			blocks: [block(280, 100, 500)],
		});
		expect(scale).toBeCloseTo((200 - 10 - 20) / 2 / 100);
	});
});

describe("maxDescriptionLines", () => {
	const params = {
		pageHeight: 200,
		margin: 10,
		firstPageTop: 10,
		headingHeight: 10,
		lineHeight: 5,
		descriptionGap: 4,
	};

	it("fits heading, description and gap in half of the usable height", () => {
		expect(maxDescriptionLines(params)).toBe(Math.floor((90 - 10 - 4) / 5));
	});

	it("measures the room below the first page's top", () => {
		expect(maxDescriptionLines({ ...params, firstPageTop: 30 })).toBe(
			Math.floor((80 - 10 - 4) / 5),
		);
	});

	it("keeps at least one line on a tiny page", () => {
		expect(maxDescriptionLines({ ...params, pageHeight: 30 })).toBe(1);
	});
});

describe("truncateDescriptionLines", () => {
	it("returns the lines as they are when they fit", () => {
		const lines = ["a", "b"];
		expect(truncateDescriptionLines(lines, 2)).toBe(lines);
	});

	it("keeps the first lines and ends the last kept one with an ellipsis", () => {
		expect(truncateDescriptionLines(["un ", "deux ", "trois"], 2)).toEqual([
			"un ",
			"deux…",
		]);
	});
});
