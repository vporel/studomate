/**
 * Flow of ladder sections over fixed-size pages. Unit-agnostic: every length (page, margin, gap,
 * header) is in the caller's unit (mm for the PDF, px for images); scene sizes are in scene px and
 * `scale` converts one scene px to one caller unit.
 */

export type LadderFlowBlock = {
	/** Height of the section's heading and description block, above its drawing. */
	headerHeight: number;
	sceneWidth: number;
	sceneHeight: number;
};

export type LadderFlowParams = {
	blocks: LadderFlowBlock[];
	pageWidth: number;
	pageHeight: number;
	margin: number;
	/** Ordinate of the first block on the first page; the following pages start at `margin`. */
	firstPageTop: number;
	/** Vertical space between two sections on the same page. */
	gap: number;
	/** Scene width (scene px) under which the common scale stops growing. */
	minSceneWidth: number;
};

export type LadderFlowPlacement = {
	/** 0-based index of the page holding the section. */
	page: number;
	/** Ordinate of the section's heading. */
	y: number;
	/** Ordinate of the separator drawn above the section, `null` when it starts a page. */
	separatorY: number | null;
};

export type LadderFlowLayout = {
	scale: number;
	placements: LadderFlowPlacement[];
	pageCount: number;
};

const EPSILON = 0.01;

/** Share of the usable page height a section's header (heading and description) may take: the
 * drawing always keeps the rest, so the common scale stays positive. */
const MAX_HEADER_SHARE = 0.5;

/** Height a section can take on any page, the first one included (below `firstPageTop`). */
function usableHeight({
	pageHeight,
	margin,
	firstPageTop,
}: Pick<LadderFlowParams, "pageHeight" | "margin" | "firstPageTop">): number {
	return pageHeight - margin - Math.max(margin, firstPageTop);
}

/**
 * Number of description lines a section header can hold, in the caller's unit: heading,
 * description and the gap below it stay within `MAX_HEADER_SHARE` of the height a section can
 * take on a page. Never less than one line.
 */
export function maxDescriptionLines({
	headingHeight,
	lineHeight,
	descriptionGap,
	...page
}: Pick<LadderFlowParams, "pageHeight" | "margin" | "firstPageTop"> & {
	headingHeight: number;
	lineHeight: number;
	descriptionGap: number;
}): number {
	const room =
		usableHeight(page) * MAX_HEADER_SHARE - headingHeight - descriptionGap;
	return Math.max(1, Math.floor(room / lineHeight));
}

/** The first `max` lines, the last one ending with an ellipsis when lines were dropped. */
export function truncateDescriptionLines(
	lines: string[],
	max: number,
): string[] {
	if (lines.length <= max) return lines;
	const kept = lines.slice(0, max);
	kept[max - 1] = `${kept[max - 1].trimEnd()}…`;
	return kept;
}

/**
 * Sections share a **common scale** and are **left-aligned**, so the power rail keeps the same
 * abscissa from one page to the next. The scale fits the widest section to the page width
 * (capped by `minSceneWidth`), **then is lowered if needed** so that the tallest section fits on
 * a page, the first one included (below `firstPageTop`). A new page starts as soon as a section
 * no longer fits.
 */
export default function layoutLadderFlow({
	blocks,
	pageWidth,
	pageHeight,
	margin,
	firstPageTop,
	gap,
	minSceneWidth,
}: LadderFlowParams): LadderFlowLayout {
	if (blocks.length === 0) return { scale: 1, placements: [], pageCount: 0 };

	const availableWidth = pageWidth - 2 * margin;
	const bottom = pageHeight - margin;
	const sectionHeight = usableHeight({ pageHeight, margin, firstPageTop });

	const maxSceneWidth = Math.max(1, ...blocks.map((b) => b.sceneWidth));
	const widthScale = availableWidth / Math.max(maxSceneWidth, minSceneWidth);

	const maxSceneHeight = Math.max(1, ...blocks.map((b) => b.sceneHeight));
	const maxHeaderHeight = Math.min(
		Math.max(...blocks.map((b) => b.headerHeight)),
		sectionHeight * MAX_HEADER_SHARE,
	);
	const heightScale = (sectionHeight - maxHeaderHeight) / maxSceneHeight;

	const scale = Math.min(widthScale, heightScale);

	let page = 0;
	let y = firstPageTop;
	const placements = blocks.map((block, i): LadderFlowPlacement => {
		const needed = block.headerHeight + block.sceneHeight * scale;
		const atPageTop = y <= firstPageTop + EPSILON;
		let startedNewPage = false;
		if (!atPageTop && y + needed > bottom) {
			page += 1;
			y = margin;
			startedNewPage = true;
		}
		const placement = {
			page,
			y,
			separatorY: i > 0 && !startedNewPage ? y - gap / 2 : null,
		};
		y += needed + gap;
		return placement;
	});

	return { scale, placements, pageCount: page + 1 };
}
