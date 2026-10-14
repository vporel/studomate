import {
	createPointFactory,
	type SceneDescriptor,
	type ScenePointDescriptor,
} from "../scene.descriptor";

const LABEL_PREFIX = "crossroads.points";
const point = createPointFactory(LABEL_PREFIX);
const LIGHT_KEYS = ["NS1", "NS2", "EO1", "EO2"] as const;
const COLORS = [
	{ id: "red", mnemonic: "rouge" },
	{ id: "orange", mnemonic: "orange" },
	{ id: "green", mnemonic: "vert" },
] as const;

const points: ScenePointDescriptor[] = LIGHT_KEYS.flatMap((key) =>
	COLORS.map(({ id, mnemonic }) =>
		point(`${id}${key}`, "actuator", "boolean", `${mnemonic}${key}`),
	),
);

const CrossroadsDescriptor: SceneDescriptor = {
	id: "crossroads",
	labelKey: "crossroads.label",
	descriptionKey: "crossroads.description",
	points,
};

export default CrossroadsDescriptor;
