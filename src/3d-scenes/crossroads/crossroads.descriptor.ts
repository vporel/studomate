import type {
	SceneDescriptor,
	ScenePointDescriptor,
} from "../scene.descriptor";

const LABEL_PREFIX = "crossroads.points";
const LIGHT_KEYS = ["NS1", "NS2", "EO1", "EO2"] as const;
const COLORS = [
	{ id: "red", mnemonic: "rouge" },
	{ id: "orange", mnemonic: "orange" },
	{ id: "green", mnemonic: "vert" },
] as const;

const points: ScenePointDescriptor[] = LIGHT_KEYS.flatMap((key) =>
	COLORS.map(({ id, mnemonic }) => ({
		id: `${id}${key}`,
		kind: "actuator" as const,
		valueType: "boolean" as const,
		labelKey: `${LABEL_PREFIX}.${id}${key}`,
		suggestedMnemonic: `${mnemonic}${key}`,
	})),
);

const CrossroadsDescriptor: SceneDescriptor = {
	id: "crossroads",
	labelKey: "crossroads.label",
	descriptionKey: "crossroads.description",
	points,
};

export default CrossroadsDescriptor;
