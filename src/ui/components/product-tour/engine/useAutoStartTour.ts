"use client";

import type { Driver } from "driver.js";
import { useEffect } from "react";

/** Time given to the editors and panels to lay out before a tour measures its anchors. */
const TOUR_LAYOUT_SETTLE_DELAY_MS = 400;

/**
 * Starts the tour once the layout has settled when `isEligible` (read on mount) allows it, and
 * destroys it on unmount. Both functions must be referentially stable.
 */
export default function useAutoStartTour(
	start: () => Promise<Driver | null>,
	isEligible: () => boolean,
): void {
	useEffect(() => {
		if (!isEligible()) return;
		let cancelled = false;
		let tour: Driver | null = null;
		const timeout = setTimeout(() => {
			void start().then((started) => {
				if (cancelled) started?.destroy();
				else tour = started;
			});
		}, TOUR_LAYOUT_SETTLE_DELAY_MS);
		return () => {
			cancelled = true;
			clearTimeout(timeout);
			tour?.destroy();
		};
	}, [start, isEligible]);
}
