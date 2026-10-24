"use client";

import TrainingProgressRepository from "@/persistence/repositories/training-progress.repository";
import TRAINING_MODULE_STEP_IDS from "@/training/module-step-ids";
import { useAuthStore } from "@/ui/stores/auth/auth.store";
import { useEffect, useState } from "react";
import { resolveTrainingResume, type TrainingResume } from "./training-resume";

/**
 * Where the user left their training, `null` while loading or when there is nothing to
 * resume. Reloaded when the signed-in user changes, since the cloud progress comes with them.
 */
export default function useTrainingResume(): TrainingResume | null {
	const userId = useAuthStore((state) => state.user?.id ?? null);
	const [resume, setResume] = useState<TrainingResume | null>(null);

	useEffect(() => {
		let cancelled = false;
		new TrainingProgressRepository()
			.getLastProgress(TRAINING_MODULE_STEP_IDS)
			.then((last) => {
				if (!cancelled) setResume(resolveTrainingResume(last));
			})
			.catch((error: unknown) => {
				console.error("Failed to read training progress:", error);
			});
		return () => {
			cancelled = true;
		};
	}, [userId]);

	return resume;
}
