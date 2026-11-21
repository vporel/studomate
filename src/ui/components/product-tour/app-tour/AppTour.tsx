"use client";

import { shouldStartAppTour } from "@/ui/components/product-tour/engine/tour-eligibility";
import useAutoStartTour from "@/ui/components/product-tour/engine/useAutoStartTour";
import useStartAppTour from "./useStartAppTour";

const AppTour = () => {
	useAutoStartTour(useStartAppTour(), shouldStartAppTour);
	return null;
};

export default AppTour;
