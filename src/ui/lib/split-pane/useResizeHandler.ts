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

			const onMouseMove = (e: globalThis.MouseEvent) => {
				const delta = isHorizontal ? e.clientX - startX : e.clientY - startY;
				const deltaPercent = (delta / containerSize) * 100;

				const newSizes = [...startSizes];

				const leftMin = parseSize(
					children[index].props.minSize ?? 0,
					containerSize,
				);
				const rightMin = parseSize(
					children[index + 1].props.minSize ?? 0,
					containerSize,
				);

				const leftMax = parseSize(
					children[index].props.maxSize ?? Infinity,
					containerSize,
				);
				const rightMax = parseSize(
					children[index + 1].props.maxSize ?? Infinity,
					containerSize,
				);

				const leftPx = startSizes[index] + deltaPercent;
				const rightPx = startSizes[index + 1] - deltaPercent;
				if (leftPx < leftMin || rightPx < rightMin) return;
				if (leftPx > leftMax || rightPx > rightMax) return;

				newSizes[index] = startSizes[index] + deltaPercent;
				newSizes[index + 1] = startSizes[index + 1] - deltaPercent;

				setSizes(newSizes);
			};

			const onMouseUp = () => {
				document.removeEventListener("mousemove", onMouseMove);
				document.removeEventListener("mouseup", onMouseUp);
				activeDragCleanupRef.current = null;
			};

			document.addEventListener("mousemove", onMouseMove);
			document.addEventListener("mouseup", onMouseUp);
			activeDragCleanupRef.current = onMouseUp;
		},
		[containerRef, isHorizontal, sizes, setSizes, children],
	);
}
