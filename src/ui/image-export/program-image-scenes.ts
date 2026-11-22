import { DrawOp, Scene } from "@/ui/lib/drawing/draw-op";
import layoutLadderFlow, {
	maxDescriptionLines,
	truncateDescriptionLines,
} from "@/ui/pdf/drawing/ladder-flow-layout";
import {
	frameScene,
	scaleOps,
	translateOps,
} from "@/ui/lib/drawing/scene-geometry";
import { wrapText } from "@/ui/lib/drawing/text-layout";
import { LadderRenderContext } from "@/ui/pdf/drawing/ladder-render-context";
import { LADDER_ZOOM } from "@/ui/pdf/drawing/ladder-scene";
import renderProgramScenes, {
	ProgramSceneConfig,
} from "@/ui/pdf/drawing/program-scene";

/** A4 landscape at 96 dpi, in px: the size of one ladder image. */
export const IMAGE_PAGE_WIDTH = 1123;
export const IMAGE_PAGE_HEIGHT = 794;

const MARGIN = 56;
const GRAFCET_MARGIN = 12;
const SECTION_HEADING_HEIGHT = 26;
const SECTION_HEADING_FONT = 15;
const SECTION_DESC_FONT = 12;
const SECTION_DESC_LINE = 15;
const SECTION_DESC_GAP = 8;
const SECTION_GAP = 30;
const SEPARATOR_COLOR = "#b4b4b4";

function blankPage(): Scene {
	return { ops: [], width: IMAGE_PAGE_WIDTH, height: IMAGE_PAGE_HEIGHT };
}

/**
 * Images of a program: a GRAFCET gives one image at its natural size; a ladder gives one
 * A4-landscape image per page of its sections, laid out like the PDF (common scale, sections
 * left-aligned, a new image as soon as a section no longer fits).
 */
export default function buildProgramImageScenes(
	config: ProgramSceneConfig,
	ladderContext?: LadderRenderContext,
): Scene[] {
	const pages = renderProgramScenes(config, ladderContext);
	if (config.type === "grafcet") {
		const { scene } = pages[0];
		const cropped = frameScene(scene.ops, GRAFCET_MARGIN);
		return [cropped.width > 0 ? cropped : scene];
	}
	return ladderPageScenes(pages);
}

function ladderPageScenes(
	pages: ReturnType<typeof renderProgramScenes>,
): Scene[] {
	const availableWidth = IMAGE_PAGE_WIDTH - 2 * MARGIN;
	const maxLines = maxDescriptionLines({
		pageHeight: IMAGE_PAGE_HEIGHT,
		margin: MARGIN,
		firstPageTop: MARGIN,
		headingHeight: SECTION_HEADING_HEIGHT,
		lineHeight: SECTION_DESC_LINE,
		descriptionGap: SECTION_DESC_GAP,
	});
	const headers = pages.map(({ description }) => {
		const lines = description
			? truncateDescriptionLines(
					wrapText(description, availableWidth, SECTION_DESC_FONT),
					maxLines,
				)
			: [];
		return {
			lines,
			height:
				SECTION_HEADING_HEIGHT +
				(lines.length
					? lines.length * SECTION_DESC_LINE + SECTION_DESC_GAP
					: 0),
		};
	});

	const { scale, placements, pageCount } = layoutLadderFlow({
		blocks: pages.map(({ scene }, i) => ({
			headerHeight: headers[i].height,
			sceneWidth: scene.width,
			sceneHeight: scene.height,
		})),
		pageWidth: IMAGE_PAGE_WIDTH,
		pageHeight: IMAGE_PAGE_HEIGHT,
		margin: MARGIN,
		firstPageTop: MARGIN,
		gap: SECTION_GAP,
		minSceneWidth: IMAGE_PAGE_WIDTH / LADDER_ZOOM,
	});
	if (pageCount === 0) return [blankPage()];

	const imageOps: DrawOp[][] = Array.from({ length: pageCount }, () => []);
	pages.forEach(({ heading, scene }, i) => {
		const { page, y, separatorY } = placements[i];
		const ops = imageOps[page];
		if (separatorY !== null) {
			ops.push({
				op: "line",
				x1: MARGIN,
				y1: separatorY,
				x2: IMAGE_PAGE_WIDTH - MARGIN,
				y2: separatorY,
				stroke: SEPARATOR_COLOR,
				strokeWidth: 1,
			});
		}
		ops.push({
			op: "text",
			x: MARGIN,
			y: y + SECTION_HEADING_FONT,
			text: heading ?? "",
			fontSize: SECTION_HEADING_FONT,
			bold: true,
		});
		headers[i].lines.forEach((line, lineIndex) =>
			ops.push({
				op: "text",
				x: MARGIN,
				y: y + SECTION_HEADING_HEIGHT + (lineIndex + 1) * SECTION_DESC_LINE - 3,
				text: line,
				fontSize: SECTION_DESC_FONT,
			}),
		);
		ops.push(
			...translateOps(
				scaleOps(scene.ops, scale),
				MARGIN,
				y + headers[i].height,
			),
		);
	});

	return imageOps.map((ops) => ({
		ops,
		width: IMAGE_PAGE_WIDTH,
		height: IMAGE_PAGE_HEIGHT,
	}));
}
