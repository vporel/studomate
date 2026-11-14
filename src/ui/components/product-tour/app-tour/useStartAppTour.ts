"use client";

import { setProductTourSeen } from "@/persistence/preferences.storage";
import { APP_TOUR_STEP_IDS } from "@/ui/components/product-tour/app-tour/app-tour-steps";
import useStartTour, {
	type TourTranslator,
} from "@/ui/components/product-tour/engine/useStartTour";
import buildTourSteps from "@/ui/components/product-tour/engine/build-tour-steps";
import type { Driver } from "driver.js";

function buildAppTourSteps(t: TourTranslator) {
	return buildTourSteps(APP_TOUR_STEP_IDS, "steps", t);
}

export default function useStartAppTour(): () => Promise<Driver | null> {
	return useStartTour(buildAppTourSteps, setProductTourSeen);
}
