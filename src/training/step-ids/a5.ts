/**
 * Identifiants stables des étapes de A5 (voir `StepData.id`, `ModuleStepper.tsx`) : source
 * unique, réutilisée par `a5/steps.ts` (contenu) et `training-module-step-ids.ts` (savoir si
 * le module est achevé, via la reprise de progression).
 */
const A5_STEP_IDS = {
	theoryOrDivergenceLadder: "theory-or-divergence-ladder",
	exerciseGrafcetOrDivergence: "exercise-grafcet-or-divergence",
	theoryAndDivergenceLadder: "theory-and-divergence-ladder",
	exerciseGrafcetAndDivergence: "exercise-grafcet-and-divergence",
	theoryGrafcetReset: "theory-grafcet-reset",
	exerciseGrafcetReset: "exercise-grafcet-reset",
	synthesisParking: "synthesis-parking",
	theoryGoingFurther: "theory-going-further",
	theoryThreeBlocks: "theory-three-blocks",
	conclusion: "conclusion",
} as const;

export default A5_STEP_IDS;
