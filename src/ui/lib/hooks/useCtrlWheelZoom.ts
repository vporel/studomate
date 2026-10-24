import { type RefObject, useEffect, useRef } from "react";

/** Wheel distance that makes one zoom step: about one notch of a mouse wheel. */
const WHEEL_DISTANCE_PER_STEP = 100;
/** `WheelEvent.DOM_DELTA_LINE`: the delta is in lines rather than pixels. */
const DOM_DELTA_LINE = 1;
const PIXELS_PER_LINE = 16;

/**
 * Turns Ctrl (Windows/Linux) or Cmd (Mac) + wheel, and trackpad pinches, over `elementRef` into
 * zoom steps (`1` to zoom in, `-1` to zoom out). The gesture is taken over the whole element,
 * whatever it covers, and never reaches the page: the browser does not zoom, and a child that
 * listens to the wheel does not see it. A plain wheel is left alone, so that it keeps scrolling.
 * A trackpad pinch sends many small deltas: they add up to a step.
 */
export default function useCtrlWheelZoom(
	elementRef: RefObject<HTMLElement | null>,
	onZoomStep: (direction: 1 | -1) => void,
): void {
	const onZoomStepRef = useRef(onZoomStep);
	useEffect(() => {
		onZoomStepRef.current = onZoomStep;
	}, [onZoomStep]);

	useEffect(() => {
		const element = elementRef.current;
		if (!element) return;
		let distance = 0;
		const handleWheel = (event: WheelEvent) => {
			if (!event.ctrlKey && !event.metaKey) return;
			event.preventDefault();
			event.stopPropagation();
			distance +=
				event.deltaMode === DOM_DELTA_LINE
					? event.deltaY * PIXELS_PER_LINE
					: event.deltaY;
			while (Math.abs(distance) >= WHEEL_DISTANCE_PER_STEP) {
				const direction = distance < 0 ? 1 : -1;
				distance += direction * WHEEL_DISTANCE_PER_STEP;
				onZoomStepRef.current(direction);
			}
		};
		element.addEventListener("wheel", handleWheel, {
			capture: true,
			passive: false,
		});
		return () => element.removeEventListener("wheel", handleWheel, true);
	}, [elementRef]);
}
