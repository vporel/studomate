/**
 * Identifiants stables des étapes de M1 (voir `StepData.id`, `ModuleStepper.tsx`) — source
 * unique, réutilisée par `m1/page.tsx` (contenu) et `../page.tsx` (savoir si le module est
 * achevé, via la reprise de progression) pour ne jamais désynchroniser les deux.
 */
const M1_STEP_IDS = {
	grafcetDefinition: "grafcet-definition",
	theory: "theory",
	theoryActions: "theory-actions",
	exerciseLinear: "exercise-linear",
	theoryTimer: "theory-timer",
	synthesisTrafficLight: "synthesis-traffic-light",
	theoryOrDivergence: "theory-or-divergence",
	exerciseOrDivergence: "exercise-or-divergence",
	exerciseAndDivergence: "exercise-and-divergence",
	synthesisParking: "synthesis-parking",
	synthesisCrossroads: "synthesis-crossroads",
	readingErrors: "reading-errors",
} as const;

export default M1_STEP_IDS;
