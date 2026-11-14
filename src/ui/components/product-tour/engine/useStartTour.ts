"use client";

import { useT } from "@/ui/i18n/useT";
import type { TourStep } from "@/ui/components/product-tour/engine/start-tour";
import type { Driver } from "driver.js";
import { useCallback } from "react";

export type TourTranslator = ReturnType<typeof useT<"tour">>;

/**
 * `buildSteps` and `onStarted` must be referentially stable (module-level functions): they
 * are dependencies of the returned starter.
 */
export default function useStartTour(
	buildSteps: (t: TourTranslator) => TourStep[],
	onStarted: () => void,
): (scopeSelector?: string) => Promise<Driver | null> {
	const t = useT("tour");
	return useCallback(
		async (scopeSelector?: string) => {
			const { default: startTour } = await import("./start-tour");
			return startTour(
				buildSteps(t),
				{
					next: t("buttons.next"),
					previous: t("buttons.previous"),
					done: t("buttons.done"),
				},
				onStarted,
				scopeSelector,
			);
		},
		[t, buildSteps, onStarted],
	);
}
