import { DrawOp, Scene } from "@/ui/lib/drawing/draw-op";
import type { ProgramSceneConfig } from "@/ui/pdf/drawing/program-scene";
import buildProgramImageScenes, {
	IMAGE_PAGE_HEIGHT,
	IMAGE_PAGE_WIDTH,
} from "./program-image-scenes";

type Page = { heading?: string; description?: string; scene: Scene };
let mockPages: Page[] = [];
jest.mock("@/ui/pdf/drawing/program-scene", () => ({
	__esModule: true,
	default: () => mockPages,
}));

const grafcetConfig = { type: "grafcet" } as unknown as ProgramSceneConfig;
const ladderConfig = { type: "ladder" } as unknown as ProgramSceneConfig;

const rect = (x: number, y: number, w: number, h: number): DrawOp => ({
	op: "rect",
	x,
	y,
	w,
	h,
});

const section = (
	height: number,
	extra: Partial<Page> = {},
	width = 800,
): Page => ({
	heading: "Section",
	scene: { ops: [rect(0, 0, width, height)], width, height },
	...extra,
});

const texts = (scene: Scene) =>
	scene.ops.filter((op) => op.op === "text") as Extract<
		DrawOp,
		{ op: "text" }
	>[];

describe("buildProgramImageScenes", () => {
	describe("grafcet", () => {
		it("returns a single image cropped to the content, not a page", () => {
			mockPages = [
				{
					scene: {
						ops: [rect(300, 400, 100, 60)],
						width: 800,
						height: 1131,
					},
				},
			];

			const scenes = buildProgramImageScenes(grafcetConfig);

			expect(scenes).toHaveLength(1);
			expect(scenes[0].width).toBe(100 + 2 * 12);
			expect(scenes[0].height).toBe(60 + 2 * 12);
		});

		it("falls back to the page scene when there is nothing to draw", () => {
			const empty = { ops: [], width: 800, height: 1131 };
			mockPages = [{ scene: empty }];

			expect(buildProgramImageScenes(grafcetConfig)).toEqual([empty]);
		});
	});

	describe("ladder", () => {
		it("puts sections that fit on one A4-landscape image", () => {
			mockPages = [section(60), section(60)];

			const scenes = buildProgramImageScenes(ladderConfig);

			expect(scenes).toHaveLength(1);
			expect(scenes[0].width).toBe(IMAGE_PAGE_WIDTH);
			expect(scenes[0].height).toBe(IMAGE_PAGE_HEIGHT);
		});

		it("writes each section heading in bold above its drawing", () => {
			mockPages = [
				section(60, { heading: "Réseau 1" }),
				section(60, { heading: "Réseau 2" }),
			];

			const [scene] = buildProgramImageScenes(ladderConfig);

			expect(texts(scene).map((t) => [t.text, t.bold])).toEqual([
				["Réseau 1", true],
				["Réseau 2", true],
			]);
		});

		it("separates two sections of the same image with a grey line", () => {
			mockPages = [section(60), section(60)];

			const [scene] = buildProgramImageScenes(ladderConfig);

			const lines = scene.ops.filter((op) => op.op === "line");
			expect(lines).toHaveLength(1);
		});

		it("wraps the description under the heading", () => {
			mockPages = [
				section(60, {
					heading: "Réseau 1",
					description: "mot ".repeat(200).trim(),
				}),
			];

			const [scene] = buildProgramImageScenes(ladderConfig);

			const [heading, ...description] = texts(scene);
			expect(heading.text).toBe("Réseau 1");
			expect(description.length).toBeGreaterThan(1);
			expect(description.every((t) => t.y > heading.y && !t.bold)).toBe(true);
		});

		it("cuts a very long description with an ellipsis and keeps the drawing visible inside the image", () => {
			mockPages = [
				section(300, {
					heading: "Réseau 1",
					description: "mot ".repeat(3000).trim(),
				}),
			];

			const [scene] = buildProgramImageScenes(ladderConfig);

			const description = texts(scene).slice(1);
			expect(description.at(-1)?.text.endsWith("…")).toBe(true);
			expect(
				description.every((t) => t.y <= IMAGE_PAGE_HEIGHT / 2),
			).toBe(true);
			const [drawing] = scene.ops.filter((op) => op.op === "rect") as Extract<
				DrawOp,
				{ op: "rect" }
			>[];
			expect(drawing.h).toBeGreaterThan(0);
			expect(drawing.y + drawing.h).toBeLessThanOrEqual(IMAGE_PAGE_HEIGHT);
		});

		it("splits the sections over several images when they no longer fit", () => {
			mockPages = Array.from({ length: 8 }, () => section(300));

			const scenes = buildProgramImageScenes(ladderConfig);

			expect(scenes.length).toBeGreaterThan(1);
			scenes.forEach((scene) => {
				expect(scene.width).toBe(IMAGE_PAGE_WIDTH);
				expect(scene.height).toBe(IMAGE_PAGE_HEIGHT);
			});
			// Every section is drawn exactly once.
			const headings = scenes.flatMap((scene) => texts(scene));
			expect(headings).toHaveLength(8);
		});

		it("starts a split image at the top margin, left-aligned like the first", () => {
			mockPages = Array.from({ length: 8 }, () => section(300));

			const scenes = buildProgramImageScenes(ladderConfig);

			const firstOfEach = scenes.map((scene) => texts(scene)[0]);
			expect(new Set(firstOfEach.map((t) => t.x)).size).toBe(1);
			expect(new Set(firstOfEach.map((t) => t.y)).size).toBe(1);
		});

		it("keeps all the drawings inside the image", () => {
			mockPages = Array.from({ length: 6 }, () => section(250));

			for (const scene of buildProgramImageScenes(ladderConfig)) {
				for (const op of scene.ops) {
					if (op.op !== "rect") continue;
					expect(op.x).toBeGreaterThanOrEqual(0);
					expect(op.y + op.h).toBeLessThanOrEqual(IMAGE_PAGE_HEIGHT);
					expect(op.x + op.w).toBeLessThanOrEqual(IMAGE_PAGE_WIDTH);
				}
			}
		});

		it("shares one scale between sections of different widths", () => {
			mockPages = [section(60, {}, 400), section(60, {}, 800)];

			const [scene] = buildProgramImageScenes(ladderConfig);

			const [narrow, wide] = scene.ops.filter(
				(op) => op.op === "rect",
			) as Extract<DrawOp, { op: "rect" }>[];
			expect(wide.w / narrow.w).toBeCloseTo(2);
		});

		it("returns a blank image for a ladder without section", () => {
			mockPages = [];

			expect(buildProgramImageScenes(ladderConfig)).toEqual([
				{ ops: [], width: IMAGE_PAGE_WIDTH, height: IMAGE_PAGE_HEIGHT },
			]);
		});
	});
});
