import {
	MouseEvent,
	ReactElement,
	useCallback,
	useEffect,
	useRef,
} from "react";
import { PaneProps } from "./split-pane";
import { parseSize } from "./useInitialSizesCalculator";

export default function useResizeHandler(
	containerRef: React.RefObject<HTMLDivElement | null>,
	isHorizontal: boolean,
	sizes: number[],
	setSizes: (sizes: number[]) => void,
	children: ReactElement<PaneProps>[],
	onDragEnd?: (index: number, size: { px: number; percent: number }) => void,
) {
	//Écouteurs d'un glisser en cours, à retirer si le composant est démonté avant le mouseup
	//(changement d'onglet, fermeture de page) : sans ça, ils survivent et continuent d'appeler
	//`setSizes` sur un composant abandonné.
	const activeDragCleanupRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		return () => {
			activeDragCleanupRef.current?.();
		};
	}, []);

	return useCallback(
		(index: number, e: MouseEvent<HTMLDivElement>) => {
			e.preventDefault();
			const startX = e.clientX;
			const startY = e.clientY;
			const rect = containerRef.current?.getBoundingClientRect();
			if (!rect) return;

			const containerSize = isHorizontal ? rect.width : rect.height;
			const startSizes = [...sizes];
			const bounds = (paneIndex: number) => ({
				min: parseSize(children[paneIndex].props.minSize ?? 0, containerSize),
				max: parseSize(
					children[paneIndex].props.maxSize ?? Infinity,
					containerSize,
				),
			});
			const left = bounds(index);
			const right = bounds(index + 1);

			//A pane can start beyond its bounds (stored size larger than its maximum, capped by CSS):
			//begin from the nearest size the drag is allowed to produce.
			const total = startSizes[index] + startSizes[index + 1];
			const lowest = Math.max(left.min, total - right.max);
			const highest = Math.min(left.max, total - right.min);
			if (lowest <= highest) {
				startSizes[index] = Math.min(
					Math.max(startSizes[index], lowest),
					highest,
				);
				startSizes[index + 1] = total - startSizes[index];
			}
			let resized: number[] | null = null;

			const onMouseMove = (e: globalThis.MouseEvent) => {
				const delta = isHorizontal ? e.clientX - startX : e.clientY - startY;
				const deltaPercent = (delta / containerSize) * 100;

				const newSizes = [...startSizes];
				const leftSize = startSizes[index] + deltaPercent;
				const rightSize = startSizes[index + 1] - deltaPercent;
				if (leftSize < left.min || rightSize < right.min) return;
				if (leftSize > left.max || rightSize > right.max) return;

				newSizes[index] = leftSize;
				newSizes[index + 1] = rightSize;

				resized = newSizes;
				setSizes(newSizes);
			};

			const onMouseUp = () => {
				document.removeEventListener("mousemove", onMouseMove);
				document.removeEventListener("mouseup", onMouseUp);
				activeDragCleanupRef.current = null;
				if (!resized) return;
				for (const paneIndex of [index, index + 1]) {
					const percent = resized[paneIndex];
					const size = { px: (percent / 100) * containerSize, percent };
					onDragEnd?.(paneIndex, size);
					children[paneIndex].props.onSizeChange?.(size);
				}
			};

			document.addEventListener("mousemove", onMouseMove);
			document.addEventListener("mouseup", onMouseUp);
			activeDragCleanupRef.current = onMouseUp;
		},
		[containerRef, isHorizontal, sizes, setSizes, children, onDragEnd],
	);
}
