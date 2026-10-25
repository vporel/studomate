/**
 * Identifiants stables des étapes de A4 (voir `StepData.id`, `ModuleStepper.tsx`) : source
 * unique, réutilisée par `a4/steps.ts` (contenu) et `training-module-step-ids.ts` (savoir si
 * le module est achevé, via la reprise de progression).
 */
const A4_STEP_IDS = {
	theoryStepsLadder: "theory-steps-ladder",
	exerciseGrafcetNaive: "exercise-grafcet-naive",
	theoryMethodLadder: "theory-method-ladder",
	theoryTwoPrograms: "theory-two-programs",
	exerciseGrafcetLinear: "exercise-grafcet-linear",
	theoryActionsLadder: "theory-actions-ladder",
	theoryEdgeActionsLadder: "theory-edge-actions-ladder",
	theoryReceptivityTimer: "theory-receptivity-timer",
	theoryMovementSupervision: "theory-movement-supervision",
	synthesisDrilling: "synthesis-drilling",
	conclusion: "conclusion",
} as const;

export default A4_STEP_IDS;
