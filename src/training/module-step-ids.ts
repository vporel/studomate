import type { TrainingModuleId } from "@/training/module-ids";
import A0_STEP_IDS from "./step-ids/a0";
import A1_STEP_IDS from "./step-ids/a1";
import A2_STEP_IDS from "./step-ids/a2";
import A3_STEP_IDS from "./step-ids/a3";
import A4_STEP_IDS from "./step-ids/a4";
import A5_STEP_IDS from "./step-ids/a5";

/** Training modules in course order, with their step ids first to last. */
const TRAINING_MODULE_STEP_IDS: {
	moduleId: TrainingModuleId;
	stepIds: string[];
}[] = [
	{ moduleId: "a0", stepIds: Object.values(A0_STEP_IDS) },
	{ moduleId: "a1", stepIds: Object.values(A1_STEP_IDS) },
	{ moduleId: "a2", stepIds: Object.values(A2_STEP_IDS) },
	{ moduleId: "a3", stepIds: Object.values(A3_STEP_IDS) },
	{ moduleId: "a4", stepIds: Object.values(A4_STEP_IDS) },
	{ moduleId: "a5", stepIds: Object.values(A5_STEP_IDS) },
];

export default TRAINING_MODULE_STEP_IDS;
