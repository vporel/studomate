type Point = [number, number];

const ARROW_LENGTH = 10;
const ARROW_HALF_WIDTH = 4;

/**
 * Triangle marking the direction of a link that runs upward, or null for a link that does not.
 * It sits on the middle of the longest mostly-vertical upward segment and points along it. A
 * segment shorter than the arrow carries none.
 */
export default function getEdgeArrowPolygon(
	vertices: readonly Point[],
): [Point, Point, Point] | null {
	let best: { from: Point; to: Point; length: number } | null = null;
	for (let i = 0; i < vertices.length - 1; i++) {
		const from = vertices[i];
		const to = vertices[i + 1];
		const dx = to[0] - from[0];
		const dy = to[1] - from[1];
		const isUpward = dy < 0 && Math.abs(dy) > Math.abs(dx);
		if (!isUpward) continue;
		const length = Math.hypot(dx, dy);
		if (length >= ARROW_LENGTH && (!best || length > best.length))
			best = { from, to, length };
	}
	if (!best) return null;

	const ux = (best.to[0] - best.from[0]) / best.length;
	const uy = (best.to[1] - best.from[1]) / best.length;
	const midX = (best.from[0] + best.to[0]) / 2;
	const midY = (best.from[1] + best.to[1]) / 2;
	const baseX = midX - (ux * ARROW_LENGTH) / 2;
	const baseY = midY - (uy * ARROW_LENGTH) / 2;
	return [
		[midX + (ux * ARROW_LENGTH) / 2, midY + (uy * ARROW_LENGTH) / 2],
		[baseX - uy * ARROW_HALF_WIDTH, baseY + ux * ARROW_HALF_WIDTH],
		[baseX + uy * ARROW_HALF_WIDTH, baseY - ux * ARROW_HALF_WIDTH],
	];
}
