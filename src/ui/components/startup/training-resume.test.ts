import TRAINING_MODULE_STEP_IDS from "@/training/module-step-ids";
import { resolveTrainingResume } from "./training-resume";

const [a0, a1] = TRAINING_MODULE_STEP_IDS;
const last = TRAINING_MODULE_STEP_IDS[TRAINING_MODULE_STEP_IDS.length - 1];

describe("resolveTrainingResume", () => {
	it("retourne null sans progression", () => {
		expect(resolveTrainingResume(null)).toBeNull();
	});

	it("reprend à l'étape sauvegardée d'un module en cours", () => {
		expect(
			resolveTrainingResume({ moduleId: "a0", stepId: a0.stepIds[1] }),
		).toEqual({
			moduleId: "a0",
			stepId: a0.stepIds[1],
			stepIndex: 1,
			stepCount: a0.stepIds.length,
			nextModule: false,
			completed: {
				moduleId: "a0",
				stepId: a0.stepIds[0],
				stepIndex: 0,
				stepCount: a0.stepIds.length,
			},
		});
	});

	it("ne rappelle aucune étape terminée au tout début d'un module", () => {
		expect(
			resolveTrainingResume({ moduleId: "a0", stepId: a0.stepIds[0] }),
		).toMatchObject({ stepIndex: 0, nextModule: false, completed: null });
	});

	it("propose la première étape du module suivant quand le module est terminé", () => {
		expect(
			resolveTrainingResume({
				moduleId: "a0",
				stepId: a0.stepIds[a0.stepIds.length - 1],
			}),
		).toEqual({
			moduleId: "a1",
			stepId: a1.stepIds[0],
			stepIndex: 0,
			stepCount: a1.stepIds.length,
			nextModule: true,
			completed: {
				moduleId: "a0",
				stepId: a0.stepIds[a0.stepIds.length - 1],
				stepIndex: a0.stepIds.length - 1,
				stepCount: a0.stepIds.length,
			},
		});
	});

	it("retourne null quand le dernier module du parcours est terminé", () => {
		expect(
			resolveTrainingResume({
				moduleId: last.moduleId,
				stepId: last.stepIds[last.stepIds.length - 1],
			}),
		).toBeNull();
	});

	it("retourne null pour un module ou une étape inconnus", () => {
		expect(
			resolveTrainingResume({ moduleId: "zz", stepId: a0.stepIds[0] }),
		).toBeNull();
		expect(
			resolveTrainingResume({ moduleId: "a0", stepId: "unknown" }),
		).toBeNull();
	});
});
