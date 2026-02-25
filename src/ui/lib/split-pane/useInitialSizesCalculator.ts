"use client";

import { ReactElement, useEffect } from "react";
import { PaneProps, SizeValue } from "./split-pane";

export function parseSize(value: SizeValue, containerSize: number): number {
	if (typeof value === "number") return (value / containerSize) * 100;
	if (typeof value === "string") {
		if (value.endsWith("%")) return parseFloat(value);
		if (value.endsWith("px")) return (parseFloat(value) / containerSize) * 100;
	}
	return 0;
}

export default function useInitialSizesCalculator(
	containerRef: React.RefObject<HTMLDivElement | null>,
	children: ReactElement<PaneProps>[],
	isHorizontal: boolean,
	setSizes: (sizes: number[]) => void
) {
	useEffect(() => {
		const rect = containerRef.current?.getBoundingClientRect();
		if (!rect) return;

		const containerSize = isHorizontal ? rect.width : rect.height;

		const converted = children.map((child) =>
			child.props.initialSize !== undefined ? parseSize(child.props.initialSize, containerSize) : 0
		);

		const totalInitial = converted.reduce((acc, v) => acc + v, 0);
		const remaining = 100 - totalInitial;
		const undefinedCount = converted.filter((s) => s === 0).length;

		const finalSizes = converted.map((s) =>
			s === 0 && undefinedCount > 0 ? remaining / undefinedCount : s
		);
		setSizes(finalSizes);
	}, [children, containerRef, isHorizontal, setSizes]);
}
