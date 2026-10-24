import type { TrainingModuleId } from "@/training/module-ids";
import TRAINING_MODULE_STEP_IDS from "@/training/module-step-ids";
import type { LastTrainingProgress } from "@/persistence/repositories/training-progress.repository";

export type TrainingStepPosition = {
	moduleId: TrainingModuleId;
	stepId: string;
	/** Position of `stepId` in its module, from 0. */
	stepIndex: number;
	stepCount: number;
};

export type TrainingResume = TrainingStepPosition & {
	/** The last module touched was finished: this resume points at the first step of the next one. */
	nextModule: boolean;
	/** The step finished just before the one to resume (the final step of the previous module
	 * when `nextModule`); `null` at the first step of a module. */
	completed: TrainingStepPosition | null;
};

/**
 * Where to send a user who last worked on `last`: back to the saved step, or to the start of
 * the following module when that one was finished. `null` when nothing was started or the
 * last module is the final one and is finished.
 */
export function resolveTrainingResume(
	last: LastTrainingProgress | null,
): TrainingResume | null {
	if (!last) return null;
	const position = TRAINING_MODULE_STEP_IDS.findIndex(
		(m) => m.moduleId === last.moduleId,
	);
	if (position === -1) return null;
	const { moduleId, stepIds } = TRAINING_MODULE_STEP_IDS[position];
	const stepIndex = stepIds.indexOf(last.stepId);
	if (stepIndex === -1) return null;
	const saved = {
		moduleId,
		stepId: last.stepId,
		stepIndex,
		stepCount: stepIds.length,
	};

	if (stepIndex < stepIds.length - 1)
		return {
			...saved,
			nextModule: false,
			completed:
				stepIndex > 0
					? {
							...saved,
							stepId: stepIds[stepIndex - 1],
							stepIndex: stepIndex - 1,
						}
					: null,
		};

	const next = TRAINING_MODULE_STEP_IDS[position + 1];
	if (!next) return null;
	return {
		moduleId: next.moduleId,
		stepId: next.stepIds[0],
		stepIndex: 0,
		stepCount: next.stepIds.length,
		nextModule: true,
		completed: saved,
	};
}
