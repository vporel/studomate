/**
 * Identifiants stables des étapes de A4 (voir `StepData.id`, `ModuleStepper.tsx`) : source
 * unique, réutilisée par `a4/page.tsx` (contenu) et `../page.tsx` (savoir si le module est
 * achevé, via la reprise de progression).
 */
const A4_STEP_IDS = {
	theoryStepsLadder: "theory-steps-ladder",
	exerciseGrafcetNaive: "exercise-grafcet-naive",
	theoryMethodLadder: "theory-method-ladder",
	exerciseGrafcetLinear: "exercise-grafcet-linear",
	theoryActionsLadder: "theory-actions-ladder",
	theoryTimedActionsLadder: "theory-timed-actions-ladder",
	synthesisDrilling: "synthesis-drilling",
	theoryDivergencesLadder: "theory-divergences-ladder",
	exerciseGrafcetOrDivergence: "exercise-grafcet-or-divergence",
	exerciseGrafcetAndDivergence: "exercise-grafcet-and-divergence",
	theoryGrafcetReset: "theory-grafcet-reset",
	exerciseGrafcetReset: "exercise-grafcet-reset",
	synthesisParking: "synthesis-parking",
	synthesisGateGrafcet: "synthesis-gate-grafcet",
} as const;

export default A4_STEP_IDS;
