/** Heading levels (1-6) of a DOM subtree, in document order. */
export function headingLevels(root: ParentNode): number[] {
	return Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6")).map(
		(h) => Number(h.tagName[1]),
	);
}

/** True when the first heading is at `firstLevel` and no heading goes down more than one level at a time. */
export function hasNoSkippedLevel(levels: number[], firstLevel = 1): boolean {
	return levels.every((level, i) =>
		i === 0 ? level === firstLevel : level <= levels[i - 1] + 1,
	);
}
