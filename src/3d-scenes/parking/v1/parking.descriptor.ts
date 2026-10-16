import { createPointFactory, type SceneDescriptor } from "@/3d-scenes/scene.descriptor";

const point = createPointFactory("parking.points");

const ParkingDescriptor: SceneDescriptor = {
	id: "parking",
	version: 1,
	imageUrl: "/images/scenes-3d/parking.png",
	labelKey: "parking.label",
	descriptionKey: "parking.description",
	points: [
		point("barrierEntry", "actuator", "boolean", "barriere_entree"),
		point("barrierExit", "actuator", "boolean", "barriere_sortie"),
		point("full", "actuator", "boolean", "complet"),
		point("entryDetector", "sensor", "boolean", "dem_entree"),
		point("exitDetector", "sensor", "boolean", "dem_sortie"),
		point("photocell", "sensor", "boolean", "passage"),
		point("places", "display", "number", "places"),
	],
};

export default ParkingDescriptor;
