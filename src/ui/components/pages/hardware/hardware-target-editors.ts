import type {
	HardwareModelId,
	HardwareTarget,
} from "@/schemas/hardware/hardware-target.schema";
import ArduinoUnoR3Editor from "./arduino/ArduinoUnoR3Editor";
import type { HardwareTargetEditor } from "./hardware-target-editor";

type EditorsByModel = {
	[M in HardwareModelId]: HardwareTargetEditor<
		Extract<HardwareTarget, { modelId: M }>
	>;
};

const EDITORS: EditorsByModel = {
	"arduino-uno-r3": ArduinoUnoR3Editor,
};

/** Editor of a model, `undefined` for a model id this version does not know. */
export default function getHardwareTargetEditor(
	modelId: string,
): HardwareTargetEditor<any> | undefined {
	return Object.hasOwn(EDITORS, modelId)
		? EDITORS[modelId as HardwareModelId]
		: undefined;
}
