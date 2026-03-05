import { MouseEvent, ReactElement, useCallback } from "react";
import { PaneProps } from "./split-pane";
import { parseSize } from "./useInitialSizesCalculator";

export default function useResizeHandler(
	containerRef: React.RefObject<HTMLDivElement | null>,
	isHorizontal: boolean,
	sizes: number[],
	setSizes: (sizes: number[]) => void,
	children: ReactElement<PaneProps>[]
) {
	return useCallback(
		(index: number, e: MouseEvent<HTMLDivElement>) => {
			e.preventDefault();
			const startX = e.clientX;
			const startY = e.clientY;
			const rect = containerRef.current?.getBoundingClientRect();
			if (!rect) return;

			const containerSize = isHorizontal ? rect.width : rect.height;
			const startSizes = [...sizes];

			const onMouseMove = (e: MouseEvent | globalThis.MouseEvent) => {
				const delta = isHorizontal ? e.clientX - startX : e.clientY - startY;
				const deltaPercent = (delta / containerSize) * 100;

				const newSizes = [...startSizes];

				const leftMin = parseSize(children[index].props.minSize ?? 0, containerSize);
				const rightMin = parseSize(children[index + 1].props.minSize ?? 0, containerSize);

				const leftMax = parseSize(children[index].props.maxSize ?? Infinity, containerSize);
				const rightMax = parseSize(children[index + 1].props.maxSize ?? Infinity, containerSize);

				const leftPx = startSizes[index] + deltaPercent;
				const rightPx = startSizes[index + 1] - deltaPercent;
				if (leftPx < leftMin || rightPx < rightMin) return;
				if (leftPx > leftMax || rightPx > rightMax) return;

				newSizes[index] = startSizes[index] + deltaPercent;
				newSizes[index + 1] = startSizes[index + 1] - deltaPercent;

				setSizes(newSizes);
			};

			const onMouseUp = () => {
				document.removeEventListener("mousemove", onMouseMove as any);
				document.removeEventListener("mouseup", onMouseUp);
			};

			document.addEventListener("mousemove", onMouseMove as any);
			document.addEventListener("mouseup", onMouseUp);
		},
		[containerRef, isHorizontal, sizes, setSizes, children]
	);
}
