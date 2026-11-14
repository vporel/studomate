export const APP_TOUR_STEP_IDS = [
	"menubar",
	"explorer",
	"pages",
	"hmiPages",
	"simulation",
	"crossReference",
	"analysis",
] as const;

export type AppTourStepId = (typeof APP_TOUR_STEP_IDS)[number];
