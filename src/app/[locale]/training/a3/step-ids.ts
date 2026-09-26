/**
 * Identifiants stables des étapes de A3 (voir `StepData.id`, `ModuleStepper.tsx`) : source
 * unique, réutilisée par `a3/page.tsx` (contenu) et `../page.tsx` (savoir si le module est
 * achevé, via la reprise de progression).
 */
const A3_STEP_IDS = {
	theoryTimers: "theory-timers",
	exerciseTimersReading: "exercise-timers-reading",
	exerciseTimers: "exercise-timers",
	theoryCounters: "theory-counters",
	exerciseCounters: "exercise-counters",
	theoryNumeric: "theory-numeric",
	exerciseTank: "exercise-tank",
	theoryTypes: "theory-types",
	exerciseScaling: "exercise-scaling",
	theoryStructure: "theory-structure",
	synthesisPacking: "synthesis-packing",
	conclusion: "conclusion",
} as const;

export default A3_STEP_IDS;
