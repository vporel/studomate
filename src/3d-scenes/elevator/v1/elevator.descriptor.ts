import { createPointFactory, type SceneDescriptor } from "@/3d-scenes/scene.descriptor";

const LABEL_PREFIX = "elevator.points";

const point = createPointFactory(LABEL_PREFIX);

const ElevatorDescriptor: SceneDescriptor = {
	id: "elevator",
	version: 1,
	imageUrl: "/images/scenes-3d/elevator.png",
	labelKey: "elevator.label",
	descriptionKey: "elevator.description",
	points: [
		point("up", "actuator", "boolean", "monter"),
		point("down", "actuator", "boolean", "descendre"),
		point("door", "actuator", "boolean", "porte"),
		point("floor0", "sensor", "boolean", "etage_0"),
		point("floor1", "sensor", "boolean", "etage_1"),
		point("floor2", "sensor", "boolean", "etage_2"),
		point("doorOpen", "sensor", "boolean", "porte_ouverte"),
		point("cabinPosition", "sensor", "number", "position"),
		point("cabinButton0", "sensor", "boolean", "cabine_0"),
		point("cabinButton1", "sensor", "boolean", "cabine_1"),
		point("cabinButton2", "sensor", "boolean", "cabine_2"),
		point("landingButton0", "sensor", "boolean", "appel_0"),
		point("landingButton1", "sensor", "boolean", "appel_1"),
		point("landingButton2", "sensor", "boolean", "appel_2"),
		point("currentFloor", "display", "number", "etage_courant"),
	],
};

export default ElevatorDescriptor;
