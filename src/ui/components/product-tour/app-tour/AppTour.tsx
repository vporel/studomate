"use client";

import shouldStartAppTour from "@/ui/components/product-tour/app-tour/app-tour-eligibility";
import useAutoStartTour from "@/ui/components/product-tour/engine/useAutoStartTour";
import useStartAppTour from "./useStartAppTour";

const AppTour = () => {
	useAutoStartTour(useStartAppTour(), shouldStartAppTour);
	return null;
};

export default AppTour;
