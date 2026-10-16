import { createPointFactory, type SceneDescriptor } from "@/3d-scenes/scene.descriptor";

const LABEL_PREFIX = "drilling.points";

const point = createPointFactory(LABEL_PREFIX);

const DrillingDescriptor: SceneDescriptor = {
	id: "drilling",
	version: 1,
	imageUrl: "/images/scenes-3d/drilling.png",
	labelKey: "drilling.label",
	descriptionKey: "drilling.description",
	points: [
		point("down", "actuator", "boolean", "descendre"),
		point("up", "actuator", "boolean", "monter"),
		point("spindle", "actuator", "boolean", "broche"),
		point("high", "sensor", "boolean", "h"),
		point("low", "sensor", "boolean", "b"),
		point("startButton", "sensor", "boolean", "dcy"),
		point("drillPosition", "sensor", "number", "position"),
	],
};

export default DrillingDescriptor;
