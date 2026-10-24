/**
 * Identifiants stables des étapes de A1 (voir `StepData.id`, `ModuleStepper.tsx`) — source
 * unique, réutilisée par `a1/page.tsx` (contenu) et `../page.tsx` (savoir si le module est
 * achevé, via la reprise de progression) pour ne jamais désynchroniser les deux.
 */
const A1_STEP_IDS = {
	grafcetDefinition: "grafcet-definition",
	theory: "theory",
	observeLinear: "observe-linear",
	theoryActions: "theory-actions",
	observeActions: "observe-actions",
	exerciseLinear: "exercise-linear",
	theoryTimer: "theory-timer",
	observeTimer: "observe-timer",
	synthesisTrafficLight: "synthesis-traffic-light",
	theoryOrDivergence: "theory-or-divergence",
	exerciseOrDivergence: "exercise-or-divergence",
	theoryAndDivergence: "theory-and-divergence",
	exerciseAndDivergence: "exercise-and-divergence",
	synthesisParking: "synthesis-parking",
	synthesisCrossroads: "synthesis-crossroads",
	readingErrors: "reading-errors",
} as const;

export default A1_STEP_IDS;
