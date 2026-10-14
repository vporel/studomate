import { createPointFactory, type SceneDescriptor } from "../scene.descriptor";

const LABEL_PREFIX = "elevator.points";

const point = createPointFactory(LABEL_PREFIX);

const ElevatorDescriptor: SceneDescriptor = {
	id: "elevator",
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
	],
};

export default ElevatorDescriptor;
