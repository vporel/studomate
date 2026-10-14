import { createPointFactory, type SceneDescriptor } from "../scene.descriptor";

const LABEL_PREFIX = "drilling.points";

const point = createPointFactory(LABEL_PREFIX);

const DrillingDescriptor: SceneDescriptor = {
	id: "drilling",
	labelKey: "drilling.label",
	descriptionKey: "drilling.description",
	points: [
		point("down", "actuator", "boolean", "descendre"),
		point("up", "actuator", "boolean", "monter"),
		point("spindle", "actuator", "boolean", "broche"),
		point("high", "sensor", "boolean", "h"),
		point("low", "sensor", "boolean", "b"),
		point("drillPosition", "sensor", "number", "position"),
	],
};

export default DrillingDescriptor;
