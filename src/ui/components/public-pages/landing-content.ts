export const grafcetCapture =
	"/images/captures-projets/parking-a-barriere_grafcet.png";
export const hmiCapture =
	"/images/captures-projets/parking-a-barriere_hmi.jpeg";
export const ladderCapture = "/images/captures-projets/project-test_ladder.png";
export const scene3dCapture = "/user-manual/scene-3d/scene-3d-1.png";
export const arduinoPhoto = "/images/targets/arduino-uno-r3.jpg";

export const logicShowcaseKeys = ["showcaseGrafcet", "showcaseLadder"] as const;

export const machineShowcaseKeys = [
	"showcaseHmi",
	"showcaseScene3d",
	"showcaseArduino",
] as const;

export const showcaseKeys = [
	...logicShowcaseKeys,
	...machineShowcaseKeys,
] as const;

export const featureKeys = [
	"featureSimulation",
	"featureManual",
	"featureCloud",
] as const;
