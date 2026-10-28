export const TRAINING_MODULE_IDS = [
	"a0",
	"a1",
	"a2",
	"a3",
	"a4",
	"a5",
] as const;

export type TrainingModuleId = (typeof TRAINING_MODULE_IDS)[number];
