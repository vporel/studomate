import type {
	SceneDescriptor,
	ScenePointDescriptor,
} from "../scene.descriptor";

const LABEL_PREFIX = "cartonSorting.points";

function actuator(id: string, suggestedMnemonic: string): ScenePointDescriptor {
	return {
		id,
		kind: "actuator",
		valueType: "boolean",
		labelKey: `${LABEL_PREFIX}.${id}`,
		suggestedMnemonic,
	};
}

function sensor(id: string, suggestedMnemonic: string): ScenePointDescriptor {
	return {
		id,
		kind: "sensor",
		valueType: "boolean",
		labelKey: `${LABEL_PREFIX}.${id}`,
		suggestedMnemonic,
	};
}

const CartonSortingDescriptor: SceneDescriptor = {
	id: "carton-sorting",
	labelKey: "cartonSorting.label",
	descriptionKey: "cartonSorting.description",
	points: [
		actuator("t1", "Cmd_T1"),
		actuator("t2t3", "Cmd_T2T3"),
		actuator("p1Out", "Cmd_P1_out"),
		actuator("p1In", "Cmd_P1_in"),
		actuator("p2Out", "Cmd_P2_out"),
		actuator("p2In", "Cmd_P2_in"),
		actuator("p3Out", "Cmd_P3_out"),
		actuator("p3In", "Cmd_P3_in"),
		sensor("cartonAtStation", "cpt_psce_c"),
		sensor("cartonHigh", "cpt_c_hte"),
		sensor("cartonAtP2", "cpt_psce_p2"),
		sensor("cartonAtP3", "cpt_psce_p3"),
		sensor("p1AtOut", "cpt_p1_out"),
		sensor("p1AtIn", "cpt_p1_in"),
		sensor("p2AtOut", "cpt_p2_out"),
		sensor("p2AtIn", "cpt_p2_in"),
		sensor("p3AtOut", "cpt_p3_out"),
		sensor("p3AtIn", "cpt_p3_in"),
	],
};

export default CartonSortingDescriptor;
