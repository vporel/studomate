"use client";

import { ReactElement, useCallback, useEffect, useRef } from "react";
import { PaneProps, SizeValue } from "./split-pane";

export function parseSize(value: SizeValue, containerSize: number): number {
	if (typeof value === "number") return (value / containerSize) * 100;
	if (typeof value === "string") {
		if (value.endsWith("%")) return parseFloat(value);
		if (value.endsWith("px")) return (parseFloat(value) / containerSize) * 100;
	}
	return 0;
}

/** Percentages of the container; panes without a size share what remains. */
export function computeSizes(
	sizes: (SizeValue | null)[],
	containerSize: number,
): number[] {
	const converted = sizes.map((size) =>
		size !== null ? parseSize(size, containerSize) : 0,
	);
	const totalInitial = converted.reduce((acc, v) => acc + v, 0);
	const remaining = 100 - totalInitial;
	const undefinedCount = converted.filter((s) => s === 0).length;
	return converted.map((s) =>
		s === 0 && undefinedCount > 0 ? remaining / undefinedCount : s,
	);
}

/**
 * Sizes the panes from their `initialSize`, again whenever the container is resized, keeping
 * the size a pane was dragged to until its `initialSize` changes. Returns the function that
 * records a dragged size.
 */
export default function useInitialSizesCalculator(
	containerRef: React.RefObject<HTMLDivElement | null>,
	children: ReactElement<PaneProps>[],
	isHorizontal: boolean,
	setSizes: (sizes: number[]) => void,
) {
	const initialSizesKey = JSON.stringify(
		children.map((child) => child.props.initialSize ?? null),
	);
	const draggedSizesRef = useRef<(SizeValue | undefined)[]>([]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const initialSizes: (SizeValue | null)[] = JSON.parse(initialSizesKey);
		draggedSizesRef.current = [];

		const apply = () => {
			const rect = container.getBoundingClientRect();
			const containerSize = isHorizontal ? rect.width : rect.height;
			//A container not laid out yet (hidden, or measured before its parent is sized).
			if (!(containerSize > 0)) return;
			setSizes(
				computeSizes(
					initialSizes.map(
						(size, index) => draggedSizesRef.current[index] ?? size,
					),
					containerSize,
				),
			);
		};

		apply();
		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(apply);
		observer.observe(container);
		return () => observer.disconnect();
	}, [initialSizesKey, containerRef, isHorizontal, setSizes]);

	return useCallback(
		(index: number, size: { px: number; percent: number }) => {
			const initialSize: SizeValue | null = JSON.parse(initialSizesKey)[index];
			if (initialSize === null) return;
			draggedSizesRef.current[index] =
				typeof initialSize === "string" && initialSize.endsWith("%")
					? `${size.percent}%`
					: size.px;
		},
		[initialSizesKey],
	);
}
